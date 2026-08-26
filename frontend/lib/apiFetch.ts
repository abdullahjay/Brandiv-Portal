import type { ApiResponse } from "@frontend/types";

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Request failed");
  return json.data!;
}
