import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchReportsPage } from "@frontend/lib/queries/listQueries";
import ReportsPageClient from "./ReportsPageClient";

export default async function ReportsPage() {
  return prefetchPage((qc) => prefetchReportsPage(qc), <ReportsPageClient />);
}
