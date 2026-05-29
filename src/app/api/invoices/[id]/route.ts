import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getInvoice, editInvoice, voidInvoice } from "@backend/services/invoiceService";
import { updateInvoiceSchema } from "@backend/validators/invoiceValidator";

// GET /api/invoices/:id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const invoice = await getInvoice(params.id);
    if (!invoice) return notFound("Invoice not found");
    return ok(invoice);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/invoices/:id
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const invoice = await editInvoice(params.id, parsed.data);
    if (!invoice) return notFound("Invoice not found");
    return ok(invoice);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/invoices/:id — cancels (soft)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role;
    if (!["super_admin", "admin", "manager", "finance"].includes(role)) {
      return unauthorized("Insufficient permissions");
    }

    const invoice = await voidInvoice(params.id);
    if (!invoice) return notFound("Invoice not found");
    return ok(invoice);
  } catch (err) {
    return serverError(err);
  }
}
