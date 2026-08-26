import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, unauthorized, notFound, badRequest, serverError } from "@backend/lib/apiResponse";
import { payInvoice } from "@backend/services/invoiceService";

// POST /api/invoices/:id/pay
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const invoice = await payInvoice(id);
    if (!invoice) return notFound("Invoice not found");
    return ok(invoice);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Only sent")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
