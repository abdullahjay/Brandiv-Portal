import { getPnLStatement, getCashFlowStatement } from "@backend/repositories/statementRepository";

export async function fetchPnL(period: string) {
  return getPnLStatement(period);
}

export async function fetchCashFlow(period: string) {
  return getCashFlowStatement(period);
}
