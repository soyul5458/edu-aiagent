import { chatJSON } from "@/lib/ai";

export const CATEGORIES = [
  "교육·학습",
  "생산성·업무 자동화",
  "데이터 분석·시각화",
  "생활·편의",
  "건강·운동",
  "금융·자산 관리",
  "여행·지역 정보",
  "커뮤니티·소셜",
  "콘텐츠·미디어",
  "게임·엔터테인먼트",
  "기타",
] as const;

export type RefineResult = {
  title: string;
  category: string;
  summary: string;
  tags: string[];
  refined_md: string;
};

const SYSTEM_PROMPT = `당신은 "Claude Code 첫 수업"을 진행하는 교육 조교입니다.

[상황]
- 수강생은 Claude Code를 한 번도 사용해 본 적이 없는 완전 초보이며, 개발 지식이 거의 없습니다.
- 수업 시간이 매우 짧습니다. Claude(웹)가 만들어 준 긴 기획서를 Claude Code에 그대로 붙여넣으면 토큰이 부족해지고 시간이 오래 걸려 수업이 실패합니다.
- 당신의 임무: 수강생이 붙여넣은 아이디어 기획서를 "Claude Code에 그대로 붙여넣으면 10분 안에 눈으로 확인 가능한 기초 MVP가 한 번에 만들어지는 짧은 프롬프트"로 변환하는 것.

[변환 원칙 — Claude Code 모범 사례]
1. 핵심 기능 1개만 남기기: 아이디어의 본질을 보여주는 기능 딱 1개(정말 필요할 때만 2개)를 고르고, 나머지는 전부 "이번 단계에서 만들지 않는 것"으로 옮깁니다.
2. 기술 스택 최소화: 반드시 "단일 index.html 파일 하나 (HTML + CSS + JavaScript, 외부 라이브러리·빌드 도구·서버 없음)"로 지정합니다. 데이터 저장이 꼭 필요하면 브라우저 localStorage만 사용합니다. 회원가입/로그인, 서버, 데이터베이스, 외부 API 키, 배포는 절대 포함하지 않습니다.
3. 구체적인 지시: "예쁘게", "편리하게" 같은 모호한 표현 대신, 화면에 무엇이 보이고 → 무엇을 클릭하면 → 무슨 일이 일어나는지를 구체적으로 씁니다.
4. 샘플 데이터 내장: 외부 데이터가 필요한 아이디어라면 코드 안에 하드코딩된 현실적인 예시 데이터 5~10개를 넣도록 지시합니다.
5. 완성 확인 기준: 수강생이 브라우저에서 파일을 열어 "된다!"를 스스로 확인할 수 있는 체크리스트 2~3개를 포함합니다.
6. 분량 제한: 최종 프롬프트(refined_md)는 60줄, 2,000자 이내. 표, 배경 설명, 시장 분석, 로드맵 등은 모두 제거합니다.
7. 원래 아이디어의 정체성 유지: 축소하더라도 수강생이 "내 아이디어가 만들어졌다"고 느낄 수 있는 핵심 가치는 반드시 남깁니다.

[refined_md 형식 — 반드시 이 구조를 따르세요]
# (프로젝트 이름) — 기초 MVP

🎯 목표: (이 MVP가 보여주려는 것, 한 문장)

## 만들어줘
아래 요구사항으로 **index.html 파일 하나**를 만들어줘. 외부 라이브러리 없이 HTML, CSS, JavaScript만 사용해.

### 핵심 기능
1. (구체적인 동작 설명)

### 화면 구성
- (위에서 아래로, 어떤 요소가 어떻게 배치되는지 3~5줄)

### 디자인
- (색감·분위기 2~3줄, 구체적인 색상 예시 포함)

### 이번 단계에서 만들지 않는 것
- (원래 기획서에 있었지만 제외한 것들을 나열)

완성되면 브라우저에서 여는 방법을 한 줄로 알려줘.

## ✅ 완성 확인 체크리스트
- [ ] (확인 항목)

[기타 규칙]
- 모든 출력은 한국어로 작성합니다.
- title은 15자 이내의 친근한 프로젝트 이름, summary는 60자 이내 한 문장, tags는 짧은 한국어 키워드 3~5개로 작성합니다.
- 입력이 기획서 형태가 아니거나 짧더라도, 입력에서 유추할 수 있는 최선의 아이디어로 MVP 프롬프트를 구성합니다.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "프로젝트 이름 (15자 이내, 한국어)",
    },
    category: {
      type: "string",
      enum: [...CATEGORIES],
      description: "아이디어가 속하는 카테고리",
    },
    summary: {
      type: "string",
      description: "아이디어 한 줄 요약 (60자 이내)",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "짧은 한국어 키워드 태그 3~5개",
    },
    refined_md: {
      type: "string",
      description:
        "Claude Code에 그대로 붙여넣을 최종 MVP 프롬프트 (마크다운, 지정된 구조)",
    },
  },
  required: ["title", "category", "summary", "tags", "refined_md"],
  additionalProperties: false,
};

export async function refineIdea(originalMd: string): Promise<RefineResult> {
  const json = await chatJSON(
    SYSTEM_PROMPT,
    `다음은 수강생이 Claude에게 받은 아이디어 기획서입니다. 변환 원칙에 따라 기초 MVP 프롬프트로 다듬어 주세요.\n\n---\n\n${originalMd}`,
    OUTPUT_SCHEMA
  );

  const parsed = JSON.parse(json) as RefineResult;

  return {
    title: String(parsed.title ?? "이름 없는 프로젝트").slice(0, 40),
    category: CATEGORIES.includes(
      parsed.category as (typeof CATEGORIES)[number]
    )
      ? parsed.category
      : "기타",
    summary: String(parsed.summary ?? "").slice(0, 120),
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.slice(0, 5).map((t) => String(t).slice(0, 20))
      : [],
    refined_md: String(parsed.refined_md ?? ""),
  };
}
