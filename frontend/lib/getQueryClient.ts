import { QueryClient, defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      dehydrate: {
        // Skip errored queries — Prisma/API errors may not serialize for hydration.
        shouldDehydrateQuery: (query) => {
          if (query.state.status === "error") return false;
          return defaultShouldDehydrateQuery(query) || query.state.status === "pending";
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
