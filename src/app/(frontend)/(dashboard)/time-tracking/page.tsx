import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchTimeTrackingPage } from "@frontend/lib/queries/listQueries";
import TimeTrackingPageClient from "./TimeTrackingPageClient";

export default async function TimeTrackingPage() {
  return prefetchPage((qc) => prefetchTimeTrackingPage(qc), <TimeTrackingPageClient />);
}
