"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-surface p-6 shadow-card"
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-soft">
          아이디
        </span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
          placeholder="예: student01"
          className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:bg-surface"
        />
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-soft">
          비밀번호
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder="비밀번호 입력"
          className="w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:bg-surface"
        />
      </label>

      {error && (
        <p className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-accent py-3 text-[15px] font-bold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
      >
        {loading ? "확인하는 중…" : "입장하기"}
      </button>
    </form>
  );
}
