import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, notFound, badRequest, serverError } from "@backend/lib/apiResponse";
import { payInvoice } from "@backend/services/invoiceService";

// POST /api/invoices/:id/pay
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const invoice = await payInvoice(params.id);
    if (!invoice) return notFound("Invoice not found");
    return ok(invoice);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Only sent")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
