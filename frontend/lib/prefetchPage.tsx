import { dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@frontend/lib/getQueryClient";
import QueryHydration from "@frontend/providers/QueryHydration";

export async function prefetchPage(
  prefetch: (qc: ReturnType<typeof getQueryClient>) => Promise<void>,
  children: React.ReactNode
) {
  const qc = getQueryClient();
  await prefetch(qc);
  return <QueryHydration state={dehydrate(qc)}>{children}</QueryHydration>;
}
