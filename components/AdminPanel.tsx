"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserRow, SubmissionRow } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default function AdminPanel({
  currentUserId,
  users,
  recent,
  categoryStats,
  totals,
}: {
  currentUserId: number;
  users: UserRow[];
  recent: SubmissionRow[];
  categoryStats: { category: string; count: number }[];
  totals: { students: number; submissions: number; today: number };
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [csvMsg, setCsvMsg] = useState("");
  const [csvExporting, setCsvExporting] = useState(false);

  async function exportCsv() {
    setCsvExporting(true);
    setCsvMsg("");
    try {
      const res = await fetch("/api/admin/export-csv", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setCsvMsg(data.error ?? "내보내기에 실패했습니다.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("content-disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || "gallery.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      setCsvMsg("갤러리가 CSV로 다운로드됐어요.");
    } catch {
      setCsvMsg("서버에 연결할 수 없습니다.");
    } finally {
      setCsvExporting(false);
    }
  }

  async function exportObsidian() {
    setExporting(true);
    setExportMsg("");
    try {
      const res = await fetch("/api/admin/export-obsidian", { method: "POST" });
      const data = await res.json();
      setExportMsg(
        res.ok
          ? `아이디어 ${data.count}개를 ${data.dir}/ 에 노트로 내보냈어요.`
          : data.error ?? "내보내기에 실패했습니다."
      );
    } catch {
      setExportMsg("서버에 연결할 수 없습니다.");
    } finally {
      setExporting(false);
    }
  }

  const maxCategory = Math.max(1, ...categoryStats.map((c) => c.count));

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          password,
          role: isAdmin ? "admin" : "student",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "계정 생성에 실패했습니다." });
        return;
      }
      setMessage({
        type: "ok",
        text: `계정이 만들어졌어요 → 아이디: ${username} / 비밀번호: ${password}`,
      });
      setName("");
      setUsername("");
      setPassword("");
      setIsAdmin(false);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  const [pwEditId, setPwEditId] = useState<number | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwDone, setPwDone] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  function openPwEditor(user: UserRow) {
    setPwEditId(user.id);
    setPwValue("");
    setPwMsg("");
  }

  async function savePassword(user: UserRow) {
    if (pwValue.length < 4) {
      setPwMsg("비밀번호는 4자 이상으로 입력해 주세요.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg(data.error ?? "비밀번호 변경에 실패했습니다.");
        return;
      }
      setPwEditId(null);
      setPwDone(
        `비밀번호가 변경됐어요 → 아이디 ${user.username} / 새 비밀번호 ${pwValue} (지금 적어두세요 — 다시 볼 수 없어요)`
      );
    } finally {
      setPwSaving(false);
    }
  }

  async function deleteUser(user: UserRow) {
    if (
      !confirm(
        `"${user.name}(${user.username})" 계정을 삭제할까요?\n계정만 삭제되고, 이 수강생이 만든 아이디어 ${user.submission_count ?? 0}개는 갤러리에 그대로 남아요.`
      )
    )
      return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="animate-fade-up space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">관리자</h1>
        <p className="mt-1 text-[15px] text-muted">
          수강생 계정을 발급하고, 수업 현황을 한눈에 확인하세요.
        </p>
      </section>

      {/* 현황 */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "수강생", value: totals.students, unit: "명" },
          { label: "등록된 아이디어", value: totals.submissions, unit: "개" },
          { label: "오늘 제출", value: totals.today, unit: "개" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-line bg-surface p-5 shadow-card"
          >
            <p className="text-sm font-semibold text-muted">{s.label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {s.value}
              <span className="ml-1 text-base font-semibold text-muted">
                {s.unit}
              </span>
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 계정 만들기 */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-bold">수강생 계정 만들기</h2>
          <form
            onSubmit={createUser}
            className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-card"
          >
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-soft">이름</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="예: 김하늘"
                className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-accent focus:bg-surface"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-soft">아이디</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="영문/숫자 3~20자, 예: student01"
                className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-accent focus:bg-surface"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-soft">비밀번호</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="4자 이상, 원하는 비밀번호"
                className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-accent focus:bg-surface"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-soft">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="h-4 w-4 accent-[#33685a]"
              />
              관리자 권한으로 만들기
            </label>

            {message && (
              <p
                className={`rounded-xl px-3.5 py-2.5 text-sm ${
                  message.type === "ok"
                    ? "bg-accent-soft text-accent-deep"
                    : "bg-danger-soft text-danger"
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-accent py-2.5 font-bold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
            >
              {creating ? "만드는 중…" : "계정 만들기"}
            </button>
          </form>

          {/* 옵시디언 내보내기 */}
          <div className="mt-6">
            <h2 className="mb-3 font-bold">옵시디언 내보내기</h2>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <p className="text-[13px] leading-relaxed text-muted">
                모든 아이디어를 지식 볼트(
                <code className="rounded bg-cream px-1 font-mono text-[11px]">
                  obsidian-vault/아이디어/
                </code>
                )에 노트 1건 = 아이디어 1개로 내보냅니다. 원본은 DB에 그대로
                남고, 노트는 다시 눌러 언제든 재생성할 수 있어요.
              </p>
              <button
                type="button"
                onClick={exportObsidian}
                disabled={exporting}
                className="mt-3 w-full rounded-xl border border-accent/40 bg-accent-soft py-2.5 font-bold text-accent-deep transition-colors hover:bg-accent hover:text-white disabled:opacity-60"
              >
                {exporting ? "내보내는 중…" : "옵시디언으로 내보내기"}
              </button>
              {exportMsg && (
                <p className="mt-3 rounded-xl bg-cream px-3.5 py-2.5 text-[13px] text-soft">
                  {exportMsg}
                </p>
              )}
            </div>
          </div>

          {/* CSV 내보내기 */}
          <div className="mt-6">
            <h2 className="mb-3 font-bold">갤러리 전체 내보내기 (CSV)</h2>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <p className="text-[13px] leading-relaxed text-muted">
                모든 아이디어를 CSV 파일로 내보냅니다. Excel이나 Google Sheets에서
                열 수 있으며, 수업 후 자료 보관용으로 사용하세요.
              </p>
              <button
                type="button"
                onClick={exportCsv}
                disabled={csvExporting}
                className="mt-3 w-full rounded-xl bg-accent py-2.5 font-bold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
              >
                {csvExporting ? "내보내는 중…" : "CSV로 다운로드"}
              </button>
              {csvMsg && (
                <p className="mt-3 rounded-xl bg-cream px-3.5 py-2.5 text-[13px] text-soft">
                  {csvMsg}
                </p>
              )}
            </div>
          </div>

          {/* 카테고리 분포 */}
          {categoryStats.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 font-bold">카테고리 분포</h2>
              <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-5 shadow-card">
                {categoryStats.map((c) => (
                  <div key={c.category}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="font-semibold text-soft">{c.category}</span>
                      <span className="text-muted">{c.count}개</span>
                    </div>
                    <div className="h-2 rounded-full bg-cream">
                      <div
                        className="h-2 rounded-full bg-accent/70"
                        style={{ width: `${(c.count / maxCategory) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 계정 목록 + 최근 제출 */}
        <section className="lg:col-span-3">
          <h2 className="mb-3 font-bold">
            계정 목록{" "}
            <span className="text-sm font-semibold text-muted">
              {users.length}개
            </span>
          </h2>
          {pwDone && (
            <p className="mb-3 rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-deep">
              {pwDone}
            </p>
          )}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-cream text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-semibold">이름</th>
                  <th className="px-4 py-2.5 font-semibold">아이디</th>
                  <th className="px-4 py-2.5 text-center font-semibold">아이디어</th>
                  <th className="px-4 py-2.5 text-right font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <Fragment key={u.id}>
                    <tr className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-semibold">
                        {u.name}
                        {u.role === "admin" && (
                          <span className="ml-1.5 rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-accent-deep">
                            관리자
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-soft">
                        {u.username}
                      </td>
                      <td className="px-4 py-3 text-center text-muted">
                        {u.submission_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            pwEditId === u.id ? setPwEditId(null) : openPwEditor(u)
                          }
                          className={`rounded-lg px-2 py-1 text-[13px] font-semibold transition-colors ${
                            pwEditId === u.id
                              ? "bg-accent-soft text-accent-deep"
                              : "text-soft hover:bg-cream"
                          }`}
                        >
                          비밀번호 변경
                        </button>
                        {u.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => deleteUser(u)}
                            className="ml-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-danger transition-colors hover:bg-danger-soft"
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                    {pwEditId === u.id && (
                      <tr className="border-b border-line bg-cream/60 last:border-0">
                        <td colSpan={4} className="px-4 py-3">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              savePassword(u);
                            }}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <span className="text-[13px] font-semibold text-soft">
                              {u.name} 님의 새 비밀번호:
                            </span>
                            <input
                              autoFocus
                              value={pwValue}
                              onChange={(e) => setPwValue(e.target.value)}
                              placeholder="4자 이상 입력"
                              className="w-44 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
                            />
                            <button
                              type="submit"
                              disabled={pwSaving}
                              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
                            >
                              {pwSaving ? "저장 중…" : "저장"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPwEditId(null)}
                              className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-muted hover:bg-cream"
                            >
                              취소
                            </button>
                            {pwMsg && (
                              <span className="text-[13px] text-danger">{pwMsg}</span>
                            )}
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 mt-6 font-bold">최근 제출된 아이디어</h2>
          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-cream px-5 py-8 text-center text-sm text-muted">
              아직 제출된 아이디어가 없어요.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/gallery/${s.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-cream"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{s.title}</p>
                      <p className="truncate text-xs text-muted">
                        {s.author_name} · {s.category}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDate(s.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
