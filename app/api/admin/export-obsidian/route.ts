import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { getDb, toPlain, type SubmissionRow } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseTags } from "@/lib/format";

function safeName(s: string): string {
  return (
    s
      .replace(/[\\/:*?"<>|#^[\]]/g, "")
      .trim()
      .slice(0, 50) || "무제"
  );
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  const db = getDb();
  const rows = toPlain<SubmissionRow>(
    db.prepare("SELECT * FROM submissions ORDER BY id ASC").all()
  );

  const ideasDir = path.join(process.cwd(), "obsidian-vault", "아이디어");
  fs.mkdirSync(ideasDir, { recursive: true });

  const categories = new Set<string>();

  for (const s of rows) {
    categories.add(s.category);
    const tags = parseTags(s.tags);
    const md = `---
제목: "${safeName(s.title)}"
작성자: ${s.author_name ?? ""}
카테고리: ${s.category}
태그: [${tags.map((t) => `"${t}"`).join(", ")}]
작성일: ${s.created_at}
원본ID: ${s.id}
---

# ${s.title}

> ${s.summary}

카테고리:: [[카테고리-${safeName(s.category)}]]

## Claude Code용 MVP 프롬프트

${s.refined_md}

## 원본 기획서

${s.original_md}
`;
    fs.writeFileSync(
      path.join(ideasDir, `${s.id}-${safeName(s.title)}.md`),
      md
    );
  }

  // 카테고리 허브 노트 (없을 때만 생성 — 백링크로 아이디어들이 모인다)
  for (const c of categories) {
    const file = path.join(ideasDir, `카테고리-${safeName(c)}.md`);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        `# ${c}\n\n이 카테고리의 아이디어들은 이 노트의 **백링크**에서 볼 수 있어요.\n\n[[홈]]\n`
      );
    }
  }

  return NextResponse.json({
    ok: true,
    count: rows.length,
    dir: "obsidian-vault/아이디어",
  });
}
