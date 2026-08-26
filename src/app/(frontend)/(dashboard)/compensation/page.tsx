import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchCompensation } from "@frontend/lib/queries/listQueries";
import CompensationPageClient from "./CompensationPageClient";

export default async function CompensationPage() {
  return prefetchPage((qc) => prefetchCompensation(qc), <CompensationPageClient />);
}
