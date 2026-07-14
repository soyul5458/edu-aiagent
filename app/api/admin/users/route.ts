import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  const role = body.role === "admin" ? "admin" : "student";

  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "아이디는 영문/숫자 3~20자로 만들어 주세요. (특수문자는 - _ 만 가능)" },
      { status: 400 }
    );
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "비밀번호는 4자 이상으로 만들어 주세요." },
      { status: 400 }
    );
  }
  if (!name) {
    return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  }

  const db = await getDb();
  const existsResult = await db.query(
    "SELECT id FROM users WHERE username = $1",
    [username]
  );
  if (existsResult.rows.length > 0) {
    return NextResponse.json(
      { error: `"${username}" 아이디는 이미 사용 중입니다.` },
      { status: 409 }
    );
  }

  const infoResult = await db.query(
    "INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id",
    [username, bcrypt.hashSync(password, 10), name, role]
  );
  const insertedId = infoResult.rows[0].id;

  return NextResponse.json({
    ok: true,
    user: { id: insertedId, username, name, role },
  });
}
