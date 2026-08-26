import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, unauthorized, serverError } from "@backend/lib/apiResponse";
import { markNotificationRead, dismissNotification } from "@backend/services/notificationService";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    const { id } = await params;
    await markNotificationRead(id, user.id);
    return ok({ read: true });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    const { id } = await params;
    await dismissNotification(id, user.id);
    return ok({ dismissed: true });
  } catch (err) {
    return serverError(err);
  }
}
