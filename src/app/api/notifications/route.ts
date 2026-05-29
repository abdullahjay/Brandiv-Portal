import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getNotifications, markAllNotificationsRead } from "@backend/services/notificationService";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    return ok(await getNotifications(session.user.id));
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    await markAllNotificationsRead(session.user.id);
    return ok({ marked: true });
  } catch (err) {
    return serverError(err);
  }
}
