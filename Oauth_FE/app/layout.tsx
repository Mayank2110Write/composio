import type { Metadata } from "next";
import { Topbar } from "@/components/Topbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAuth Ready",
  description: "See what it takes to get your OAuth app ready for any provider: the steps, your work, the wait for approval, and what will block you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Topbar />
        <main className="container">{children}</main>
        <footer className="container footer">
          OAuth Ready. Guides cite their sources; check anything marked Community or Unverified before you rely on it.
        </footer>
      </body>
    </html>
  );
}
