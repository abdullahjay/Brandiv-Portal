import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, serverError } from "@backend/lib/apiResponse";
import { markNotificationRead, dismissNotification } from "@backend/services/notificationService";

export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    const { id } = await params;
    await markNotificationRead(id, session.user.id);
    return ok({ read: true });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    const { id } = await params;
    await dismissNotification(id, session.user.id);
    return ok({ dismissed: true });
  } catch (err) {
    return serverError(err);
  }
}
