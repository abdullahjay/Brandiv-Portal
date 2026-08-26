import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getNotifications, markAllNotificationsRead } from "@backend/services/notificationService";

export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    return ok(await getNotifications(user.id));
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    await markAllNotificationsRead(user.id);
    return ok({ marked: true });
  } catch (err) {
    return serverError(err);
  }
}
