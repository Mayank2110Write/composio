import Link from "next/link";

export default function Topbar({ children }) {
  return (
    <header className="topbar">
      <Link href="/" className="wordmark">OAuth Ready</Link>
      <div>{children}</div>
    </header>
  );
}
