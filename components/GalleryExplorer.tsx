"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SubmissionRow } from "@/lib/db";
import { formatDate, parseTags } from "@/lib/format";

export default function GalleryExplorer({
  submissions,
}: {
  submissions: SubmissionRow[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of submissions) {
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [submissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      if (category !== "전체" && s.category !== category) return false;
      if (!q) return true;
      const haystack =
        `${s.title} ${s.summary} ${s.author_name} ${s.tags}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [submissions, query, category]);

  return (
    <div className="animate-fade-up space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">아이디어 갤러리</h1>
          <p className="mt-1 text-[15px] text-muted">
            우리 반 모두가 만들고 있는 아이디어{" "}
            <b className="text-accent-deep">{submissions.length}개</b> —
            어떤 것들이 만들어지고 있는지 구경해 보세요.
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 태그로 검색"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] shadow-card outline-none transition-colors placeholder:text-muted/70 focus:border-accent sm:w-64 sm:flex-shrink-0"
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip
            label="전체"
            count={submissions.length}
            active={category === "전체"}
            onClick={() => setCategory("전체")}
          />
          {categories.map(([cat, count]) => (
            <CategoryChip
              key={cat}
              label={cat}
              count={count}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-cream px-5 py-12 text-center text-sm text-muted">
          {submissions.length === 0
            ? "아직 공유된 아이디어가 없어요. 첫 번째 주인공이 되어 보세요!"
            : "조건에 맞는 아이디어가 없어요. 검색어나 카테고리를 바꿔 보세요."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                href={`/gallery/${s.id}`}
                className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift"
              >
                <span className="self-start rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-deep">
                  {s.category}
                </span>
                <h2 className="mt-3 font-bold leading-snug">{s.title}</h2>
                <p className="mt-1.5 line-clamp-2 flex-1 text-[13.5px] leading-relaxed text-muted">
                  {s.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {parseTags(s.tags)
                    .slice(0, 3)
                    .map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-line bg-cream px-2 py-0.5 text-[11px] text-muted"
                      >
                        #{t}
                      </span>
                    ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                  <span className="font-semibold text-soft">
                    {s.author_name}
                  </span>
                  <span>{formatDate(s.created_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-accent text-white"
          : "border border-line bg-surface text-muted hover:border-accent/40 hover:text-ink"
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );
}
