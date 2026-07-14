import { getDb, toPlain, type SubmissionRow } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return Response.json(
      { error: "관리자만 접근할 수 있습니다." },
      { status: 401 }
    );
  }

  try {
    const db = getDb();
    const submissions = toPlain<SubmissionRow>(
      db
        .prepare(
          `SELECT id, title, category, summary, tags, prompt, created_at, author_name
           FROM submissions
           ORDER BY created_at DESC`
        )
        .all()
    );

    const headers = [
      "ID",
      "제목",
      "카테고리",
      "요약",
      "태그",
      "MVP 프롬프트",
      "만든 사람",
      "작성일시",
    ];

    const rows = submissions.map((s) => [
      s.id.toString(),
      `"${s.title.replace(/"/g, '""')}"`,
      s.category,
      `"${s.summary.replace(/"/g, '""')}"`,
      s.tags ? `"${s.tags.replace(/"/g, '""')}"` : "",
      `"${s.prompt.replace(/"/g, '""')}"`,
      s.author_name,
      formatDate(s.created_at),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );

    const filename = `aistudio-gallery-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("CSV 내보내기 실패:", error);
    return Response.json(
      { error: "CSV 내보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}
