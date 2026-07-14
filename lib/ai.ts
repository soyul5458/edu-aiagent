/**
 * 범용 AI 제공자 연동 모듈
 *
 * 사용법 (.env.local):
 *   방법 A) 제공자별 키만 넣기 — 자동 인식
 *     FIREWORKS_API_KEY=... / OPENAI_API_KEY=... / GROQ_API_KEY=... 등
 *   방법 B) 명시 설정 (어떤 회사든 가능)
 *     AI_PROVIDER=fireworks|openai|groq|together|openrouter|deepseek|xai|gemini|anthropic|custom
 *     AI_API_KEY=...      (custom 또는 키 env가 없는 경우)
 *     AI_MODEL=...        (선택 — 비우면 제공자별 기본 모델)
 *     AI_BASE_URL=...     (custom일 때 필수, OpenAI 호환 엔드포인트)
 */
import Anthropic from "@anthropic-ai/sdk";

type PresetId =
  | "fireworks"
  | "openai"
  | "groq"
  | "together"
  | "openrouter"
  | "deepseek"
  | "xai"
  | "gemini"
  | "anthropic"
  | "custom";

type Preset = {
  id: PresetId;
  label: string;
  kind: "anthropic" | "openai-compat";
  baseUrl: string;
  keyEnvs: string[];
  defaultModel: string;
  /** response_format 지원 방식: schema(스키마 강제) / json_object / none */
  jsonMode: "schema" | "json_object" | "none";
};

const PRESETS: Preset[] = [
  {
    id: "fireworks",
    label: "Fireworks AI",
    kind: "openai-compat",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    keyEnvs: ["FIREWORKS_API_KEY"],
    defaultModel: "", // 계정에서 사용 가능한 모델 자동 선택
    jsonMode: "schema",
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai-compat",
    baseUrl: "https://api.openai.com/v1",
    keyEnvs: ["OPENAI_API_KEY"],
    defaultModel: "gpt-4o-mini",
    jsonMode: "json_object",
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai-compat",
    baseUrl: "https://api.groq.com/openai/v1",
    keyEnvs: ["GROQ_API_KEY"],
    defaultModel: "llama-3.3-70b-versatile",
    jsonMode: "json_object",
  },
  {
    id: "together",
    label: "Together AI",
    kind: "openai-compat",
    baseUrl: "https://api.together.xyz/v1",
    keyEnvs: ["TOGETHER_API_KEY"],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    jsonMode: "json_object",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai-compat",
    baseUrl: "https://openrouter.ai/api/v1",
    keyEnvs: ["OPENROUTER_API_KEY"],
    defaultModel: "deepseek/deepseek-chat",
    jsonMode: "json_object",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai-compat",
    baseUrl: "https://api.deepseek.com/v1",
    keyEnvs: ["DEEPSEEK_API_KEY"],
    defaultModel: "deepseek-chat",
    jsonMode: "json_object",
  },
  {
    id: "xai",
    label: "xAI",
    kind: "openai-compat",
    baseUrl: "https://api.x.ai/v1",
    keyEnvs: ["XAI_API_KEY"],
    defaultModel: "grok-3-mini",
    jsonMode: "json_object",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "openai-compat",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyEnvs: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    defaultModel: "gemini-2.5-flash",
    jsonMode: "json_object",
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    kind: "anthropic",
    baseUrl: "",
    keyEnvs: ["ANTHROPIC_API_KEY"],
    defaultModel: "claude-opus-4-8",
    jsonMode: "schema",
  },
];

export type ResolvedProvider = {
  id: PresetId;
  label: string;
  kind: "anthropic" | "openai-compat";
  baseUrl: string;
  apiKey: string;
  model: string; // 빈 문자열이면 자동 선택 (fireworks)
  jsonMode: "schema" | "json_object" | "none";
};

export function resolveProvider(): ResolvedProvider | null {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (explicit === "custom") {
    const baseUrl = process.env.AI_BASE_URL?.trim();
    const apiKey = process.env.AI_API_KEY?.trim();
    if (!baseUrl || !apiKey) return null;
    return {
      id: "custom",
      label: "사용자 지정 AI",
      kind: "openai-compat",
      baseUrl: baseUrl.replace(/\/$/, ""),
      apiKey,
      model: process.env.AI_MODEL?.trim() || "",
      jsonMode: "none",
    };
  }

  if (explicit) {
    const preset = PRESETS.find((p) => p.id === explicit);
    if (preset) {
      const apiKey =
        process.env.AI_API_KEY?.trim() ||
        preset.keyEnvs.map((k) => process.env[k]?.trim()).find(Boolean);
      if (!apiKey) return null;
      return {
        id: preset.id,
        label: preset.label,
        kind: preset.kind,
        baseUrl: process.env.AI_BASE_URL?.trim() || preset.baseUrl,
        apiKey,
        model: process.env.AI_MODEL?.trim() || preset.defaultModel,
        jsonMode: preset.jsonMode,
      };
    }
  }

  // 명시 설정이 없으면: 등록된 제공자 키를 순서대로 탐색
  for (const preset of PRESETS) {
    const apiKey = preset.keyEnvs
      .map((k) => process.env[k]?.trim())
      .find(Boolean);
    if (apiKey) {
      return {
        id: preset.id,
        label: preset.label,
        kind: preset.kind,
        baseUrl: preset.baseUrl,
        apiKey,
        model: process.env.AI_MODEL?.trim() || preset.defaultModel,
        jsonMode: preset.jsonMode,
      };
    }
  }

  // 마지막: 범용 커스텀 설정
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  if (baseUrl && apiKey) {
    return {
      id: "custom",
      label: "사용자 지정 AI",
      kind: "openai-compat",
      baseUrl: baseUrl.replace(/\/$/, ""),
      apiKey,
      model: process.env.AI_MODEL?.trim() || "",
      jsonMode: "none",
    };
  }

  return null;
}

/* ────────────── Fireworks 전용: 사용 가능한 모델 자동 선택 ────────────── */

const FIREWORKS_PREFERRED = [
  "accounts/fireworks/models/deepseek-v3p1",
  "accounts/fireworks/models/kimi-k2-instruct",
  "accounts/fireworks/models/qwen3-235b-a22b",
  "accounts/fireworks/models/gpt-oss-120b",
  "accounts/fireworks/models/llama4-maverick-instruct-basic",
];
const FIREWORKS_LAST_RESORT = "accounts/fireworks/models/gpt-oss-120b";

const g = globalThis as unknown as { __autoModel?: Record<string, string> };

async function autoPickModel(p: ResolvedProvider): Promise<string> {
  g.__autoModel ??= {};
  const cacheKey = `${p.id}:${p.baseUrl}`;
  if (g.__autoModel[cacheKey]) return g.__autoModel[cacheKey];

  try {
    const res = await fetch(`${p.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${p.apiKey}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { data?: { id: string }[] };
      const available = new Set((data.data ?? []).map((m) => m.id));
      const picked =
        FIREWORKS_PREFERRED.find((m) => available.has(m)) ??
        [...available].find((id) =>
          /kimi|deepseek|qwen|gpt-oss|llama/.test(id)
        );
      if (picked) {
        g.__autoModel[cacheKey] = picked;
        return picked;
      }
    }
  } catch {
    // 목록 조회 실패 시 기본값으로 진행
  }
  return FIREWORKS_LAST_RESORT;
}

/* ───────────────────────── 공통 JSON 대화 호출 ───────────────────────── */

export class AIConfigError extends Error {}

/**
 * 시스템/유저 메시지를 보내고, 주어진 JSON 스키마에 맞는 객체(JSON 문자열)를 돌려받는다.
 * 어떤 제공자든 동작하도록: 스키마를 프롬프트에도 내장 + 가능한 경우 response_format 사용,
 * 미지원 파라미터는 오류 메시지를 보고 자동으로 빼고 1~2회 재시도.
 */
export async function chatJSON(
  systemPrompt: string,
  userMessage: string,
  schema: Record<string, unknown>
): Promise<string> {
  const provider = resolveProvider();
  if (!provider) {
    throw new AIConfigError(
      "AI API 키가 설정되어 있지 않습니다. 서버의 .env.local 파일에 API 키를 넣어 주세요. (관리자 문의)"
    );
  }

  if (provider.kind === "anthropic") {
    return chatJSONAnthropic(provider, systemPrompt, userMessage, schema);
  }
  return chatJSONOpenAICompat(provider, systemPrompt, userMessage, schema);
}

async function chatJSONAnthropic(
  p: ResolvedProvider,
  systemPrompt: string,
  userMessage: string,
  schema: Record<string, unknown>
): Promise<string> {
  const client = new Anthropic({ apiKey: p.apiKey });

  try {
    const response = await client.messages.create({
      model: p.model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      output_config: { format: { type: "json_schema", schema } },
    });

    if (response.stop_reason === "refusal") {
      throw new Error(
        "안전상의 이유로 요청이 거절되었습니다. 아이디어 내용을 확인한 뒤 다시 시도해 주세요."
      );
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("모델 응답에서 결과를 찾지 못했습니다. 다시 시도해 주세요.");
    }
    return textBlock.text;
  } catch (err) {
    // Anthropic SDK 에러 처리
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();

      if (msg.includes("401") || msg.includes("invalid api key")) {
        throw new AIConfigError(
          `${p.label} API 키가 유효하지 않습니다. 키를 다시 확인해 .env.local에 넣어 주세요. (관리자 문의)`
        );
      }
      if (msg.includes("402") || msg.includes("insufficient_quota")) {
        throw new AIConfigError(
          `${p.label} 크레딧이 부족합니다. 결제 상태를 확인해 주세요. (관리자 문의)`
        );
      }
      if (msg.includes("429") || msg.includes("rate_limit")) {
        throw new Error(
          "지금 요청이 몰려 있어요. 30초 정도 기다렸다가 다시 시도해 주세요."
        );
      }
      if (msg.includes("500") || msg.includes("server error")) {
        throw new Error(
          `${p.label} 서버에 일시적인 문제가 발생했어요. 1분 후 다시 시도해 주세요.`
        );
      }
      if (msg.includes("timeout")) {
        throw new Error(
          "요청 처리 시간이 초과됐어요. 다시 시도해 주세요. 계속 문제가 있으면 관리자에게 알려주세요."
        );
      }

      // 이미 처리된 에러는 그대로 전파
      if (err instanceof AIConfigError || err.message.includes("안전상") || err.message.includes("결과를")) {
        throw err;
      }

      throw new Error(
        `${p.label} 호출 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요. (계속 문제가 있으면 관리자 문의)`
      );
    }

    throw new Error(
      "알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요."
    );
  }
}

async function chatJSONOpenAICompat(
  p: ResolvedProvider,
  systemPrompt: string,
  userMessage: string,
  schema: Record<string, unknown>
): Promise<string> {
  const model = p.model || (p.id === "fireworks" ? await autoPickModel(p) : "");
  if (!model) {
    throw new AIConfigError(
      `${p.label} 사용 시 모델 이름이 필요합니다. .env.local에 AI_MODEL을 설정해 주세요. (관리자 문의)`
    );
  }

  // 스키마를 프롬프트에 내장 — response_format을 지원하지 않는 제공자에서도 동작
  const system =
    systemPrompt +
    `\n\n[출력 형식] 반드시 아래 JSON 스키마에 맞는 JSON 객체 하나로만 응답하세요. JSON 외의 텍스트는 절대 출력하지 마세요.\n${JSON.stringify(schema)}`;

  type Body = {
    model: string;
    messages: { role: string; content: string }[];
    max_tokens?: number;
    max_completion_tokens?: number;
    temperature?: number;
    response_format?: Record<string, unknown>;
  };

  const body: Body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    max_tokens: 8192,
    temperature: 0.4,
  };
  if (p.jsonMode === "schema") {
    body.response_format = { type: "json_object", schema };
  } else if (p.jsonMode === "json_object") {
    body.response_format = { type: "json_object" };
  }

  // 제공자마다 미지원 파라미터가 달라서, 400 오류 문구를 보고 조정하며 최대 3회 시도
  let lastErrorBody = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      let text = data.choices?.[0]?.message?.content ?? "";
      text = text
        .replace(/<think>[\s\S]*?<\/think>/g, "")
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start === -1 || end === -1) {
        throw new Error(
          "모델 응답에서 결과를 찾지 못했습니다. 다시 시도해 주세요."
        );
      }
      return text.slice(start, end + 1);
    }

    lastErrorBody = await res.text().catch(() => "");

    if (res.status === 401 || res.status === 403) {
      throw new AIConfigError(
        `${p.label} API 키가 유효하지 않습니다. 키를 다시 확인해 .env.local에 넣어 주세요. (관리자 문의)`
      );
    }
    if (res.status === 402) {
      throw new AIConfigError(
        `${p.label} 크레딧이 부족합니다. 결제 상태를 확인해 주세요. (관리자 문의)`
      );
    }
    if (res.status === 404) {
      throw new AIConfigError(
        `${p.label} 모델(${model})을 찾을 수 없습니다. .env.local의 AI_MODEL 설정을 확인해 주세요. (관리자 문의)`
      );
    }
    if (res.status === 429) {
      throw new Error(
        "지금 요청이 몰려 있어요. 30초 정도 기다렸다가 다시 시도해 주세요."
      );
    }

    // 400: 미지원 파라미터를 오류 문구 기반으로 제거/교체 후 재시도
    if (res.status === 400) {
      let adjusted = false;
      if (body.response_format && /response_format|json/i.test(lastErrorBody)) {
        delete body.response_format;
        adjusted = true;
      }
      if (
        body.max_tokens !== undefined &&
        /max_completion_tokens/i.test(lastErrorBody)
      ) {
        body.max_completion_tokens = body.max_tokens;
        delete body.max_tokens;
        adjusted = true;
      }
      if (body.temperature !== undefined && /temperature/i.test(lastErrorBody)) {
        delete body.temperature;
        adjusted = true;
      }
      if (adjusted) continue;
    }

    // 5xx 에러 또는 기타 오류
    if (res.status >= 500) {
      throw new Error(
        `${p.label} 서버에 일시적인 문제가 발생했어요. 1분 후 다시 시도해 주세요. (상태: ${res.status})`
      );
    }

    break;
  }

  console.error(`[ai:${p.id}] 호출 실패:`, lastErrorBody.slice(0, 500));

  // 응답이 있지만 예상 형식이 아닌 경우 더 구체적인 메시지
  if (lastErrorBody) {
    const errorType = lastErrorBody.includes("rate_limit")
      ? "요청이 몰려있어 처리할 수 없어요"
      : lastErrorBody.includes("invalid")
        ? "입력 형식 오류가 발생했어요"
        : "AI 서버에서 오류를 반환했어요";
    throw new Error(
      `${errorType}. 잠시 후 다시 시도해 주세요. 계속 문제가 있으면 관리자에게 알려주세요.`
    );
  }

  throw new Error(
    "AI 서버에 연결할 수 없어요. 인터넷 연결을 확인하고 다시 시도해 주세요. (계속 문제가 있으면 관리자 문의)"
  );
}
