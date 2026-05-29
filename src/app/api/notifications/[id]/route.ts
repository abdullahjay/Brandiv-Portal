import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, serverError } from "@backend/lib/apiResponse";
import { markNotificationRead, dismissNotification } from "@backend/services/notificationService";

export async function PUT(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    await markNotificationRead(params.id, session.user.id);
    return ok({ read: true });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    await dismissNotification(params.id, session.user.id);
    return ok({ dismissed: true });
  } catch (err) {
    return serverError(err);
  }
}
