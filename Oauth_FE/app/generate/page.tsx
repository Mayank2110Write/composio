import { Suspense } from "react";
import { GenerateClient } from "./GenerateClient";

export const metadata = { title: "Research an app · OAuth Ready" };

export default function Page() {
  return (
    <Suspense>
      <GenerateClient />
    </Suspense>
  );
}
