import type { ReactNode } from "react";
import { dehydrate, type DehydratedState } from "@tanstack/react-query";
import { getQueryClient } from "@frontend/lib/getQueryClient";
import QueryHydration from "@frontend/providers/QueryHydration";

export async function prefetchPage(
  prefetch: (qc: ReturnType<typeof getQueryClient>) => Promise<void>,
  children: ReactNode
) {
  const qc = getQueryClient();
  try {
    await prefetch(qc);
  } catch (err) {
    console.error("[prefetchPage] prefetch failed:", err);
  }

  let state: DehydratedState;
  try {
    state = dehydrate(qc);
  } catch (err) {
    console.error("[prefetchPage] dehydrate failed:", err);
    state = dehydrate(getQueryClient());
  }

  return <QueryHydration state={state}>{children}</QueryHydration>;
}
