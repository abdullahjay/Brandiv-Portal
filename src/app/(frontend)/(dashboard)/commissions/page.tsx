import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchCommissions } from "@frontend/lib/queries/listQueries";
import CommissionsPageClient from "./CommissionsPageClient";

export default async function CommissionsPage() {
  return prefetchPage((qc) => prefetchCommissions(qc), <CommissionsPageClient />);
}
