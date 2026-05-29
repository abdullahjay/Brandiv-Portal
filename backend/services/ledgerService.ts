import { listLedgerEntries, type LedgerQuery } from "@backend/repositories/ledgerRepository";

export async function getLedger(q: LedgerQuery) {
  return listLedgerEntries(q);
}
