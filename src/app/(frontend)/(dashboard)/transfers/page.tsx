import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchTransfersPage } from "@frontend/lib/queries/listQueries";
import TransfersPageClient from "./TransfersPageClient";

export default async function TransfersPage() {
  return prefetchPage((qc) => prefetchTransfersPage(qc), <TransfersPageClient />);
}
