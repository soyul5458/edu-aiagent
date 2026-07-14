import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDb, toPlainOne, type SubmissionRow } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { refineIdea } from "@/lib/refine";
import { AIConfigError } from "@/lib/ai";

// Claude 호출은 30초~2분가량 걸릴 수 있음
export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const original = String(body.original ?? "").trim();

  if (original.length < 30) {
    return NextResponse.json(
      { error: "아이디어 내용이 너무 짧습니다. Claude에게 받은 기획서를 그대로 붙여넣어 주세요." },
      { status: 400 }
    );
  }
  if (original.length > 80000) {
    return NextResponse.json(
      { error: "내용이 너무 깁니다. 8만 자 이내로 줄여서 붙여넣어 주세요." },
      { status: 400 }
    );
  }

  try {
    const result = await refineIdea(original);

    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO submissions (user_id, author_name, title, category, summary, tags, original_md, refined_md)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.id,
        session.name,
        result.title,
        result.category,
        result.summary,
        JSON.stringify(result.tags),
        original,
        result.refined_md
      );

    const row = toPlainOne<SubmissionRow>(
      db
        .prepare("SELECT * FROM submissions WHERE id = ?")
        .get(info.lastInsertRowid as number)
    );

    return NextResponse.json({ submission: row });
  } catch (e) {
    // lib/ai.ts에서 던진 설정 에러 (관리자 대상)
    if (e instanceof AIConfigError) {
      return NextResponse.json(
        { error: e.message },
        { status: 500 }
      );
    }

    // lib/ai.ts에서 던진 일반 에러 (사용자 대상 - 재시도 권유)
    if (e instanceof Error && e.message) {
      // 설정 에러인지 확인
      if (
        e.message.includes("API 키") ||
        e.message.includes("크레딧") ||
        e.message.includes("모델") ||
        e.message.includes("env.local") ||
        e.message.includes("관리자")
      ) {
        return NextResponse.json(
          { error: e.message },
          { status: 500 }
        );
      }
      // 사용자 재시도 에러
      return NextResponse.json(
        { error: e.message },
        { status: 429 }
      );
    }

    // SDK 레벨 에러 (호환성 유지)
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Claude API 인증에 실패했습니다. 서버의 ANTHROPIC_API_KEY 설정을 확인해 주세요. (관리자 문의)" },
        { status: 500 }
      );
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "지금 요청이 몰려 있어요. 30초 정도 기다렸다가 다시 시도해 주세요." },
        { status: 429 }
      );
    }
    if (e instanceof Anthropic.APIConnectionError) {
      return NextResponse.json(
        { error: "네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    console.error("[refine] error:", e);
    return NextResponse.json(
      { error: "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
