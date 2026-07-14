import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.query(
    "SELECT user_id FROM submissions WHERE id = $1",
    [submissionId]
  );
  const row = result.rows[0] as { user_id: number } | undefined;

  if (!row) {
    return NextResponse.json({ error: "이미 삭제된 항목입니다." }, { status: 404 });
  }
  if (row.user_id !== session.id && session.role !== "admin") {
    return NextResponse.json({ error: "본인의 아이디어만 삭제할 수 있습니다." }, { status: 403 });
  }

  await db.query("DELETE FROM submissions WHERE id = $1", [submissionId]);
  return NextResponse.json({ ok: true });
}
