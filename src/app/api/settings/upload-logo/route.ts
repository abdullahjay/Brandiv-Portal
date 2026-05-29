import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@backend/lib/apiResponse";
import { upsertManySettings } from "@backend/repositories/settingRepository";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = (session.user as { role?: string }).role ?? "";
    if (!["super_admin", "admin"].includes(role)) return forbidden();

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;

    if (!file || file.size === 0) return badRequest("No file provided");
    if (!ALLOWED_TYPES[file.type]) return badRequest("Unsupported file type. Use PNG, JPG, SVG, or WebP.");
    if (file.size > MAX_SIZE) return badRequest("File must be under 2 MB");

    const ext = ALLOWED_TYPES[file.type];
    const filename = `logo${ext}`;

    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    const logoUrl = `/uploads/${filename}`;
    await upsertManySettings({ logo_url: logoUrl });

    return ok({ logoUrl });
  } catch (err) {
    return serverError(err);
  }
}
