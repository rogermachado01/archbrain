import { Suspense } from "react";
import ArchVizApp from "@/components/ArchVizApp";

// ArchVizApp reads navigation state via useSearchParams (deep links — see
// CLAUDE.md's "Data sources" section), which Next requires a Suspense
// boundary above in production builds.
export default function Page() {
  return (
    <Suspense fallback={<div className="app-loading">Loading architecture…</div>}>
      <ArchVizApp />
    </Suspense>
  );
}
