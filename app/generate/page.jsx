import { Suspense } from "react";
import GenerateClient from "./GenerateClient";

export const metadata = { title: "Researching app | OAuth Ready" };

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GenerateClient />
    </Suspense>
  );
}
