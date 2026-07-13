import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@backend/lib/apiResponse";
import { getProjectUpsells, createProjectUpsell } from "@backend/services/upsellService";
import { hasModuleAccess } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    const upsells = await getProjectUpsells(params.id);
    return ok(upsells);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!hasModuleAccess(session.user.role, "commissions")) return forbidden();
    const body = await req.json();
    const upsell = await createProjectUpsell(params.id, body);
    return created(upsell);
  } catch (err: any) {
    if (err?.name === "ZodError") return badRequest(err.errors[0]?.message ?? "Invalid input");
    return serverError(err);
  }
}
