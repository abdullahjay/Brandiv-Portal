import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchAccountsPage } from "@frontend/lib/queries/listQueries";
import AccountsPageClient from "./AccountsPageClient";

export default async function AccountsPage() {
  return prefetchPage((qc) => prefetchAccountsPage(qc), <AccountsPageClient />);
}
