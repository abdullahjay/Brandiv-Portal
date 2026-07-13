import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, forbidden, badRequest, notFound, serverError } from "@backend/lib/apiResponse";
import { approveProjectUpsell } from "@backend/services/upsellService";
import { hasModuleAccess } from "@/lib/permissions";

type Ctx = { params: { id: string; upsellId: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!hasModuleAccess(session.user.role, "commissions")) return forbidden();
    const result = await approveProjectUpsell(params.upsellId);
    return ok(result);
  } catch (err: any) {
    if (err?.message === "Upsell not found") return notFound("Upsell not found");
    if (err?.message?.includes("already")) return badRequest(err.message);
    return serverError(err);
  }
}
