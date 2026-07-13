import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@backend/lib/apiResponse";
import { editProjectUpsell, removeProjectUpsell } from "@backend/services/upsellService";
import { hasModuleAccess } from "@/lib/permissions";

type Ctx = { params: { id: string; upsellId: string } };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!hasModuleAccess(session.user.role, "commissions")) return forbidden();
    const body = await req.json();
    const upsell = await editProjectUpsell(params.upsellId, body);
    return ok(upsell);
  } catch (err: any) {
    if (err?.message === "Upsell not found") return notFound("Upsell not found");
    if (err?.message?.includes("Only pending")) return badRequest(err.message);
    if (err?.name === "ZodError") return badRequest(err.errors[0]?.message ?? "Invalid input");
    return serverError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!hasModuleAccess(session.user.role, "commissions")) return forbidden();
    await removeProjectUpsell(params.upsellId);
    return ok({ deleted: true });
  } catch (err: any) {
    if (err?.message === "Upsell not found") return notFound("Upsell not found");
    if (err?.message?.includes("Only pending")) return badRequest(err.message);
    return serverError(err);
  }
}
