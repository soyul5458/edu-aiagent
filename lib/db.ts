import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
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
  user_id: number | null; // 계정이 삭제되면 NULL — 기록은 보존됨
  author_name: string; // 작성 시점의 이름 스냅샷 (계정 삭제 후에도 유지)
  title: string;
  category: string;
  summary: string;
  tags: string; // JSON string array
  original_md: string;
  refined_md: string;
  created_at: string;
};

/**
 * node:sqlite는 행을 null-프로토타입 객체로 반환하는데,
 * Next.js는 서버 → 클라이언트 컴포넌트 직렬화에서 이를 거부한다.
 * DB 결과를 컴포넌트에 넘기기 전에 반드시 이 함수로 일반 객체화할 것.
 */
export function toPlain<T>(rows: unknown[]): T[] {
  return rows.map((r) => ({ ...(r as object) })) as T[];
}

export function toPlainOne<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

const g = globalThis as unknown as { __eduDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (g.__eduDb) return g.__eduDb;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new DatabaseSync(path.join(dataDir, "platform.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      original_md TEXT NOT NULL,
      refined_md TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(category);
  `);

  // ── 마이그레이션: 구버전 스키마(CASCADE 삭제, author_name 없음) → 기록 보존 스키마 ──
  const cols = db.prepare("PRAGMA table_info(submissions)").all() as {
    name: string;
  }[];
  if (!cols.some((c) => c.name === "author_name")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN;
      CREATE TABLE submissions_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author_name TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        original_md TEXT NOT NULL,
        refined_md TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
      INSERT INTO submissions_migrated
        (id, user_id, author_name, title, category, summary, tags, original_md, refined_md, created_at)
      SELECT s.id, s.user_id, COALESCE(u.name, '(삭제된 계정)'),
             s.title, s.category, s.summary, s.tags, s.original_md, s.refined_md, s.created_at
      FROM submissions s LEFT JOIN users u ON u.id = s.user_id;
      DROP TABLE submissions;
      ALTER TABLE submissions_migrated RENAME TO submissions;
      CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(category);
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
    console.log("[db] 마이그레이션 완료: 계정을 삭제해도 아이디어 기록이 보존됩니다.");
  }

  const admins = db
    .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")
    .get() as { c: number };

  if (admins.c === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin1234";
    db.prepare(
      "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, 'admin')"
    ).run(username, bcrypt.hashSync(password, 10), "관리자");
    console.log(
      `\n[초기 설정] 관리자 계정이 생성되었습니다 → 아이디: ${username} / 비밀번호: ${password}\n`
    );
  }

  g.__eduDb = db;
  return db;
}
