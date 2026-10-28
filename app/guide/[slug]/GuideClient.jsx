"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import GuideView, { ShareButton } from "@/components/GuideView";
import IntentSheet from "@/components/IntentSheet";
import { getGuideDef, resolveGuide } from "@/lib/guides";
import { readIntent, intentQuery } from "@/lib/intent";

export default function GuideClient({ slug }) {
  const router = useRouter();
  const params = useSearchParams();
  const def = getGuideDef(slug);
  const intent = readIntent(params, def);
  const guide = useMemo(() => resolveGuide(def, intent), [def, intent.does, intent.who, intent.brand]);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Topbar><ShareButton /></Topbar>
      <main className="page">
        <GuideView guide={guide} intent={intent} onEditIntent={() => setEditing(true)} />
      </main>
      {editing && (
        <IntentSheet
          appName={def.name}
          doesOptions={def.does}
          initial={intent}
          submitLabel="Update guide"
          onClose={() => setEditing(false)}
          onSubmit={(next) => {
            setEditing(false);
            router.replace(`/guide/${slug}?${intentQuery(next)}`, { scroll: false });
          }}
        />
      )}
    </>
  );
}
