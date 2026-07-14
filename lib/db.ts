import { Pool, PoolClient } from "pg";
import bcrypt from "bcryptjs";

export type SessionUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "student";
};

export type UserRow = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "student";
  created_at: string;
  submission_count?: number;
};

export type SubmissionRow = {
  id: number;
  user_id: number | null;
  author_name: string;
  title: string;
  category: string;
  summary: string;
  tags: string;
  original_md: string;
  refined_md: string;
  prompt: string;
  created_at: string;
};

export function toPlain<T>(rows: unknown[]): T[] {
  return rows.map((r) => ({ ...(r as object) })) as T[];
}

export function toPlainOne<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

const g = globalThis as unknown as { __pool?: Pool };

function getPool(): Pool {
  if (g.__pool) return g.__pool;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL 환경 변수가 설정되어 있지 않습니다. .env.local 파일에 추가해 주세요."
    );
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on("error", (err) => {
    console.error("[db] Unexpected error on idle client", err);
  });

  g.__pool = pool;
  return pool;
}

async function initializeDatabase(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author_name TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        original_md TEXT NOT NULL,
        refined_md TEXT NOT NULL,
        prompt TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(category);`
    );

    // 마이그레이션: prompt 칼럼 추가 (기존 데이터는 refined_md를 prompt로 사용)
    const hasPrompt = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'submissions' AND column_name = 'prompt'
    `);
    if (hasPrompt.rows.length === 0) {
      await client.query(
        `ALTER TABLE submissions ADD COLUMN prompt TEXT NOT NULL DEFAULT '';`
      );
      console.log("[db] 마이그레이션: prompt 칼럼 추가됨");
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function ensureAdmin(): Promise<void> {
  const pool = getPool();

  const result = await pool.query(
    "SELECT COUNT(*) as c FROM users WHERE role = 'admin'"
  );
  const adminCount = parseInt(result.rows[0].c, 10);

  if (adminCount === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin1234";
    const passwordHash = bcrypt.hashSync(password, 10);

    await pool.query(
      "INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, 'admin')",
      [username, passwordHash, "관리자"]
    );

    console.log(
      `\n[초기 설정] 관리자 계정이 생성되었습니다 → 아이디: ${username} / 비밀번호: ${password}\n`
    );
  }
}

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;

  try {
    await initializeDatabase();
    await ensureAdmin();
    initialized = true;
  } catch (err) {
    console.error("[db] 초기화 실패:", err);
    throw err;
  }
}

export async function getDb(): Promise<Pool> {
  const pool = getPool();
  await ensureInitialized();
  return pool;
}

// 개발/테스트용: DB 초기화
export async function resetDb(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DROP TABLE IF EXISTS submissions CASCADE");
    await client.query("DROP TABLE IF EXISTS users CASCADE");
    await client.query("COMMIT");
    initialized = false;
    await ensureInitialized();
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// 연결 종료 (서버 셧다운 시)
export async function closeDb(): Promise<void> {
  if (g.__pool) {
    await g.__pool.end();
    g.__pool = undefined;
    initialized = false;
  }
}
