import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl shadow-card">
            <span aria-hidden>🌱</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            AI 에이전트 스튜디오
          </h1>
          <p className="mt-2 text-sm text-muted">
            내 아이디어를 Claude Code로 만들어 보는 수업 공간
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-muted">
          아이디와 비밀번호는 강사님이 나눠드려요. 못 받았다면 손을 들어 주세요 🙋
        </p>
      </div>
    </main>
  );
}
