"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-soft transition-colors hover:border-muted hover:text-ink"
    >
      로그아웃
    </button>
  );
}
