"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

export function Topbar() {
  const path = usePathname();
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand" aria-label="OAuth Ready home">
          <span className="brand-mark">◆</span>
          OAuth Ready
        </Link>
        <nav className="nav">
          {api.mode === "mock" && (
            <span className="mode-pill" title="No backend connected. Library guides are real; live research is simulated.">
              Demo mode
            </span>
          )}
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            Home
          </Link>
          <Link href="/method" aria-current={path === "/method" ? "page" : undefined}>
            How we rate
          </Link>
        </nav>
      </div>
    </header>
  );
}
