import { redirect } from "next/navigation";
import { getSession } from "@backend/lib/auth";

// Root page — redirect based on auth state
export default async function RootPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  redirect("/dashboard");
}
