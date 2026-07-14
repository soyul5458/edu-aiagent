import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 에이전트 스튜디오",
  description:
    "Claude Code 수업용 플랫폼 — 아이디어를 MVP 프롬프트로 다듬고, 모두의 아이디어를 함께 봅니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
