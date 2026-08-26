import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@backend/lib/apiResponse";
import { upsertSettingsSchema } from "@backend/validators/settingsValidator";
import { getAllSettings, upsertSettings } from "@backend/services/settingService";

export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const role = user.role as string;
    if (!["super_admin", "admin", "finance"].includes(role)) return forbidden();

    return ok(await getAllSettings());
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const role = user.role as string;
    if (!["super_admin", "admin"].includes(role)) return forbidden();

    const body = await req.json();
    const parsed = upsertSettingsSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    return ok(await upsertSettings(parsed.data));
  } catch (err) {
    return serverError(err);
  }
}
