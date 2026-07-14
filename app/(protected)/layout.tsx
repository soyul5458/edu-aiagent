import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import NavLinks from "@/components/NavLinks";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm"
              >
                🌱
              </span>
              <span className="tracking-tight">AI 에이전트 스튜디오</span>
            </Link>
            <NavLinks isAdmin={session.role === "admin"} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:block">
              <b className="font-semibold text-soft">{session.name}</b> 님
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        Claude Code 수업용 플랫폼 · 아이디어를 작게 만들어서 크게 배워요
      </footer>
    </>
  );
}
