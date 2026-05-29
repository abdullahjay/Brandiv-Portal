import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listInvoices, addInvoice } from "@backend/services/invoiceService";
import { listInvoicesSchema, createInvoiceSchema } from "@backend/validators/invoiceValidator";

// GET /api/invoices
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listInvoicesSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const data = await listInvoices(parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/invoices
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const invoice = await addInvoice(parsed.data);
    return created(invoice);
  } catch (err) {
    return serverError(err);
  }
}
