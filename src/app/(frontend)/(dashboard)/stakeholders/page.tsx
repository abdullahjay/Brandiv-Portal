import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchStakeholdersPage } from "@frontend/lib/queries/listQueries";
import StakeholdersPageClient from "./StakeholdersPageClient";

export default async function StakeholdersPage() {
  return prefetchPage((qc) => prefetchStakeholdersPage(qc), <StakeholdersPageClient />);
}
