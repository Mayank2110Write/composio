import Link from "next/link";
import Topbar from "@/components/Topbar";

export default function NotFound() {
  return (
    <>
      <Topbar />
      <main className="page home">
        <h1>There's no guide here.</h1>
        <p className="lede">Search for the app instead, and the agent will research it.</p>
        <p><Link href="/" className="btn">Search apps</Link></p>
      </main>
    </>
  );
}
