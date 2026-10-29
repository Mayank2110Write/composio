import Link from "next/link";

// The same way back to the home screen, in the same place, on every page.
export function Breadcrumbs({ current }: { current?: string }) {
  return (
    <nav className="crumbs no-print" aria-label="Breadcrumb">
      <Link href="/">← Home</Link>
      {current && (
        <>
          <span aria-hidden>/</span>
          <span aria-current="page">{current}</span>
        </>
      )}
    </nav>
  );
}
