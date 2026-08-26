import { prefetchPage } from "@frontend/lib/prefetchPage";
import { prefetchUsers } from "@frontend/lib/queries/listQueries";
import UsersPageClient from "./UsersPageClient";

export default async function UsersPage() {
  return prefetchPage((qc) => prefetchUsers(qc), <UsersPageClient />);
}
