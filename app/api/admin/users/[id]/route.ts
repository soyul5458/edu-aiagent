import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);
  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "비밀번호는 4자 이상으로 만들어 주세요." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const result = await db.query(
    "UPDATE users SET password_hash = $1 WHERE id = $2",
    [bcrypt.hashSync(password, 10), userId]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "존재하지 않는 계정입니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (userId === session.id) {
    return NextResponse.json(
      { error: "본인 계정은 삭제할 수 없습니다." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const result = await db.query("DELETE FROM users WHERE id = $1", [userId]);
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "존재하지 않는 계정입니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
