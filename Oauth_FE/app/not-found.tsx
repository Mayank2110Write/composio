import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function NotFound() {
  return (
    <div className="gen stack">
      <Breadcrumbs current="Page not found" />
      <h1>Page not found</h1>
      <p className="muted">Search for an app from the home screen instead.</p>
      <Link className="btn" href="/">
        Go to the home screen
      </Link>
    </div>
  );
}
