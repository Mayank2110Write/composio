import type { Metadata } from "next";
import { Suspense } from "react";
import { LIBRARY } from "@/lib/guides";
import { GuidePage } from "./GuidePage";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = LIBRARY.find((d) => d.slug === slug);
  return doc
    ? { title: `${doc.name} OAuth plan · OAuth Ready`, description: doc.tagline }
    : { title: "OAuth plan · OAuth Ready" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return (
    <Suspense>
      <GuidePage slug={slug} />
    </Suspense>
  );
}
