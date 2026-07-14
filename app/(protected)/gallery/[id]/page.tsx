import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, toPlainOne, type SubmissionRow } from "@/lib/db";
import { formatDate, parseTags } from "@/lib/format";
import CopyButton from "@/components/CopyButton";
import DownloadButton from "@/components/DownloadButton";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) notFound();

  const db = getDb();
  const row = db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .get(submissionId);

  if (!row) notFound();
  const submission = toPlainOne<SubmissionRow>(row);

  const tags = parseTags(submission.tags);

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6">
      <Link
        href="/gallery"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-ink"
      >
        ← 갤러리로 돌아가기
      </Link>

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-deep">
            {submission.category}
          </span>
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-line bg-cream px-2.5 py-1 text-xs text-muted"
            >
              #{t}
            </span>
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {submission.title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-soft">
          {submission.summary}
        </p>
        <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
          <b className="font-semibold text-soft">{submission.author_name}</b>{" "}
          님이 만들었어요 · {formatDate(submission.created_at)}
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between gap-2 border-b border-line px-6 py-4">
          <h2 className="font-bold">Claude Code용 MVP 프롬프트</h2>
          <div className="flex shrink-0 gap-2">
            <DownloadButton
              text={submission.refined_md}
              filename={`${submission.title}-MVP프롬프트`}
            />
            <CopyButton text={submission.refined_md} label="프롬프트 복사" />
          </div>
        </div>
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap p-6 font-sans text-[13.5px] leading-relaxed">
          {submission.refined_md}
        </pre>
      </section>

      <details className="rounded-2xl border border-dashed border-line bg-cream px-6 py-4">
        <summary className="cursor-pointer select-none text-sm font-semibold text-soft">
          원본 기획서 보기 (Claude가 처음 만들어 준 내용)
        </summary>
        <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 font-sans text-[13px] leading-relaxed text-muted">
          {submission.original_md}
        </pre>
      </details>
    </div>
  );
}
