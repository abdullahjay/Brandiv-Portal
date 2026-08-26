import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getInvoice, editInvoice, voidInvoice } from "@backend/services/invoiceService";
import { updateInvoiceSchema } from "@backend/validators/invoiceValidator";

// GET /api/invoices/:id
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const invoice = await getInvoice(id);
    if (!invoice) return notFound("Invoice not found");
    return ok(invoice);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/invoices/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { id } = await params;
    const invoice = await editInvoice(id, parsed.data);
    if (!invoice) return notFound("Invoice not found");
    return ok(invoice);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/invoices/:id — cancels (soft)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const role = user.role;
    if (!["super_admin", "admin", "manager", "finance"].includes(role)) {
      return unauthorized("Insufficient permissions");
    }

    const { id } = await params;
    const invoice = await voidInvoice(id);
    if (!invoice) return notFound("Invoice not found");
    return ok(invoice);
  } catch (err) {
    return serverError(err);
  }
}
