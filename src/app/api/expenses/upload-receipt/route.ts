import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@backend/lib/apiResponse";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

// 3 MB limit — no server-side compression, so keep it reasonable
const MAX_SIZE = 3 * 1024 * 1024;

const EXT_MAP: Record<string, string> = {
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const role = user.role ?? "";
    if (!["super_admin", "admin", "finance", "manager"].includes(role)) return forbidden();

    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;

    if (!file || file.size === 0) return badRequest("No file provided");
    if (!ALLOWED_TYPES.has(file.type)) return badRequest("Only PNG, JPG, or WebP images are allowed.");
    if (file.size > MAX_SIZE) return badRequest("File must be under 3 MB");

    const ext = EXT_MAP[file.type] ?? "jpg";
    const filename = `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "expenses");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    return ok({ receiptUrl: `/uploads/expenses/${filename}` });
  } catch (err) {
    return serverError(err);
  }
}
