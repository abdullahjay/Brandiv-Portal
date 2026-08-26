import { prefetchPage } from "@frontend/lib/prefetchPage";
import { currentPeriod, prefetchDashboard } from "@frontend/lib/queries/listQueries";
import DashboardPageClient from "./DashboardPageClient";

export default async function DashboardPage() {
  const period = currentPeriod();
  return prefetchPage((qc) => prefetchDashboard(qc, period), <DashboardPageClient />);
}
