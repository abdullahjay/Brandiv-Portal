import { redirect } from "next/navigation";
import { getSession } from "@backend/lib/auth";

// Never statically prerender — auth state is only known at request time
export const dynamic = "force-dynamic";

// Root page — redirect based on auth state
export default async function RootPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  redirect("/dashboard");
}
