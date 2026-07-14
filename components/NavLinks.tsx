"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const base =
  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors";

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "내 작업실" },
    { href: "/gallery", label: "아이디어 갤러리" },
    ...(isAdmin ? [{ href: "/admin", label: "관리자" }] : []),
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`${base} ${
            isActive(l.href)
              ? "bg-accent-soft text-accent-deep"
              : "text-muted hover:bg-surface hover:text-ink"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
