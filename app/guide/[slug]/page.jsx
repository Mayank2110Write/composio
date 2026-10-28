import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LIBRARY, getGuideDef } from "@/lib/guides";
import GuideClient from "./GuideClient";

export function generateStaticParams() {
  return LIBRARY.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const def = getGuideDef(slug);
  return { title: def ? `${def.name} OAuth app guide | OAuth Ready` : "Guide not found" };
}

export default async function GuidePage({ params }) {
  const { slug } = await params;
  if (!getGuideDef(slug)) notFound();
  return (
    <Suspense fallback={null}>
      <GuideClient slug={slug} />
    </Suspense>
  );
}
