"use client";

import { useEffect, useRef, useState } from "react";
import type { SubmissionRow } from "@/lib/db";
import { formatDate, parseTags } from "@/lib/format";
import CopyButton from "@/components/CopyButton";
import DownloadButton from "@/components/DownloadButton";

const IDEA_PROMPT_FOR_CLAUDE = `나는 코딩을 전혀 모르는 초보자야. Claude Code로 간단한 웹 서비스를 만들어 보려고 해.
내 아이디어는 "(여기에 아이디어를 한두 문장으로)"이야.
이 아이디어를 어떤 기능과 화면으로 만들면 좋을지, 마크다운 기획서로 정리해 줘.`;

const LOADING_MESSAGES = [
  "기획서를 꼼꼼히 읽는 중이에요…",
  "핵심 기능 하나를 골라내는 중이에요…",
  "군더더기를 걷어내는 중이에요…",
  "Claude Code용 프롬프트로 압축하는 중이에요…",
  "완성 확인 체크리스트를 만드는 중이에요…",
  "거의 다 됐어요! 마지막 다듬기 중…",
];

export default function Workspace({
  userName,
  initialSubmissions,
}: {
  userName: string;
  initialSubmissions: SubmissionRow[];
}) {
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmissionRow | null>(null);
  const [history, setHistory] = useState<SubmissionRow[]>(initialSubmissions);
  const [showOriginal, setShowOriginal] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 7000);
    return () => clearInterval(timer);
  }, [loading]);

  async function refine() {
    setError("");
    setResult(null);
    setShowOriginal(false);
    setLoading(true);
    setLoadingMsg(LOADING_MESSAGES[0]);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "다듬기에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      const submission = data.submission as SubmissionRow;
      setResult(submission);
      setHistory((prev) => [submission, ...prev]);
      setOriginal("");
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100
      );
    } catch {
      setError("서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("이 아이디어를 삭제할까요? 갤러리에서도 사라져요.")) return;
    const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setHistory((prev) => prev.filter((s) => s.id !== id));
      if (result?.id === id) setResult(null);
    }
  }

  return (
    <div className="animate-fade-up space-y-8">
      {/* 인사 + 3단계 안내 */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          {userName} 님의 작업실
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          Claude에게 받은 기획서를 붙여넣으면, 수업 시간 안에 완성할 수 있는{" "}
          <b className="text-accent-deep">기초 MVP 프롬프트</b>로 다듬어 드려요.
        </p>

        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: "기획서 가져오기",
              desc: "Claude(웹)에게 아이디어 기획서를 받아 전체를 복사해요.",
            },
            {
              n: "2",
              title: "여기에 붙여넣기",
              desc: "아래 입력창에 붙여넣고 [MVP 프롬프트 만들기]를 눌러요.",
            },
            {
              n: "3",
              title: "Claude Code에 붙여넣기",
              desc: "완성된 프롬프트를 복사해 Claude Code에 붙여넣으면 끝!",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-line bg-surface p-4 shadow-card"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-deep">
                {s.n}
              </span>
              <p className="mt-2 text-sm font-bold">{s.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>

        <details className="mt-3 rounded-2xl border border-dashed border-line bg-cream px-4 py-3 text-sm">
          <summary className="cursor-pointer select-none font-semibold text-soft">
            💬 아직 기획서가 없나요? Claude에게 이렇게 물어보세요
          </summary>
          <div className="mt-3 space-y-2">
            <pre className="whitespace-pre-wrap rounded-xl border border-line bg-surface p-3 font-sans text-[13px] leading-relaxed text-soft">
              {IDEA_PROMPT_FOR_CLAUDE}
            </pre>
            <CopyButton text={IDEA_PROMPT_FOR_CLAUDE} label="질문 프롬프트 복사" />
          </div>
        </details>
      </section>

      {/* 입력 영역 */}
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">아이디어 기획서 붙여넣기</h2>
          <span className="text-xs text-muted">{original.length.toLocaleString()}자</span>
        </div>
        <textarea
          value={original}
          onChange={(e) => setOriginal(e.target.value)}
          disabled={loading}
          placeholder={
            "Claude에게 받은 마크다운 기획서를 여기에 통째로 붙여넣으세요.\n(길어도 괜찮아요 — 여기서 짧게 다듬어 드릴게요)"
          }
          className="h-56 w-full resize-y rounded-xl border border-line bg-cream p-4 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:bg-surface disabled:opacity-60"
        />
        {error && (
          <p className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs leading-relaxed text-muted">
            다듬는 데 30초~2분 정도 걸려요. 결과는 자동으로 저장되고
            갤러리에 공유돼요.
          </p>
          <button
            type="button"
            onClick={refine}
            disabled={loading || original.trim().length < 30}
            className="shrink-0 rounded-xl bg-accent px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "다듬는 중…" : "✨ MVP 프롬프트 만들기"}
          </button>
        </div>
      </section>

      {/* 로딩 상태 */}
      {loading && (
        <section className="rounded-2xl border border-accent/30 bg-accent-soft/60 p-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-1.5">
            <span className="loading-dot h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="loading-dot h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="loading-dot h-2.5 w-2.5 rounded-full bg-accent" />
          </div>
          <p className="font-semibold text-accent-deep">{loadingMsg}</p>
          <p className="mt-1 text-sm text-accent-deep/70">
            창을 닫지 말고 잠시만 기다려 주세요
          </p>
        </section>
      )}

      {/* 결과 */}
      {result && (
        <section
          ref={resultRef}
          className="animate-fade-up scroll-mt-20 rounded-2xl border-2 border-accent/40 bg-surface shadow-lift"
        >
          <div className="border-b border-line px-6 py-5">
            <p className="text-sm font-semibold text-accent-deep">
              ✨ MVP 프롬프트가 완성됐어요!
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              {result.title}
            </h2>
            <p className="mt-1.5 text-sm text-muted">{result.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-deep">
                {result.category}
              </span>
              {parseTags(result.tags).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line bg-cream px-2.5 py-1 text-xs text-muted"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative px-6 py-5">
            <div className="absolute right-6 top-5 flex gap-2">
              <DownloadButton
                text={result.refined_md}
                filename={`${result.title}-MVP프롬프트`}
              />
              <CopyButton text={result.refined_md} label="프롬프트 복사" />
            </div>
            <p className="mb-3 text-sm font-bold text-soft">
              Claude Code에 붙여넣을 프롬프트
            </p>
            <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 font-sans text-[13.5px] leading-relaxed text-ink">
              {result.refined_md}
            </pre>
          </div>

          <div className="mx-6 mb-5 rounded-xl bg-accent-soft/70 px-5 py-4">
            <p className="text-sm font-bold text-accent-deep">
              이제 이렇게 하세요
            </p>
            <ol className="mt-2 space-y-1 text-sm text-accent-deep/90">
              <li>
                1. 위의 <b>[프롬프트 복사]</b> 버튼을 누르세요
              </li>
              <li>
                2. 터미널에서{" "}
                <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] font-bold">
                  claude
                </code>
                를 실행하세요
              </li>
              <li>3. 붙여넣기(Cmd+V / Ctrl+V) 후 Enter — 완성될 때까지 기다리면 돼요</li>
            </ol>
          </div>

          <div className="border-t border-line px-6 py-3">
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className="text-sm font-semibold text-muted transition-colors hover:text-ink"
            >
              {showOriginal ? "▲ 원본 기획서 접기" : "▼ 내가 붙여넣은 원본 보기"}
            </button>
            {showOriginal && (
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 font-sans text-[13px] leading-relaxed text-muted">
                {result.original_md}
              </pre>
            )}
          </div>
        </section>
      )}

      {/* 히스토리 */}
      <section>
        <h2 className="mb-3 font-bold">
          내가 다듬은 아이디어{" "}
          <span className="text-sm font-semibold text-muted">
            {history.length}개
          </span>
        </h2>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-cream px-5 py-8 text-center text-sm text-muted">
            아직 다듬은 아이디어가 없어요. 위에 기획서를 붙여넣고 시작해 보세요!
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((s) => (
              <HistoryItem key={s.id} submission={s} onDelete={remove} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HistoryItem({
  submission,
  onDelete,
}: {
  submission: SubmissionRow;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-2xl border border-line bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <p className="truncate font-bold">{submission.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {submission.summary}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-deep sm:block">
            {submission.category}
          </span>
          <span className="text-xs text-muted">
            {formatDate(submission.created_at)}
          </span>
          <span className="text-muted">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-line px-5 py-4">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-cream p-4 font-sans text-[13px] leading-relaxed">
            {submission.refined_md}
          </pre>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              <CopyButton text={submission.refined_md} label="프롬프트 복사" />
              <DownloadButton
                text={submission.refined_md}
                filename={`${submission.title}-MVP프롬프트`}
              />
            </div>
            <button
              type="button"
              onClick={() => onDelete(submission.id)}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
