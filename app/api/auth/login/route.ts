import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json(
      { error: "아이디와 비밀번호를 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const result = await db.query(
    "SELECT id, username, password_hash, name, role FROM users WHERE username = $1",
    [username]
  );
  const user = result.rows[0] as
    | {
        id: number;
        username: string;
        password_hash: string;
        name: string;
        role: "admin" | "student";
      }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  await createSession({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({ ok: true, role: user.role });
}
