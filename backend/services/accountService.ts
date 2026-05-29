import {
  findAllAccounts,
  findAccountById,
  createAccount,
  updateAccount,
  getTotalDistributionSharePct,
  accountExists,
  deleteAccount,
} from "@backend/repositories/accountRepository";
import type { CreateAccountInput, UpdateAccountInput, ListAccountsInput } from "@backend/validators/accountValidator";

export async function listAccounts(input: ListAccountsInput) {
  return findAllAccounts(input);
}

export async function getAccount(id: string) {
  return findAccountById(id);
}

export async function addAccount(data: CreateAccountInput) {
  if ((data.type === "stakeholder" || data.type === "company_reserve") && data.sharePct && data.sharePct > 0) {
    const existing = await getTotalDistributionSharePct();
    if (existing + data.sharePct > 100) {
      throw new Error(
        `Share % would exceed 100%. Current total: ${existing.toFixed(2)}%, adding: ${data.sharePct}%`
      );
    }
  }
  return createAccount(data);
}

export async function removeAccount(id: string): Promise<boolean> {
  const exists = await accountExists(id);
  if (!exists) return false;
  await deleteAccount(id);
  return true;
}

export async function editAccount(id: string, data: UpdateAccountInput) {
  const exists = await accountExists(id);
  if (!exists) return null;

  if (data.sharePct !== undefined && data.sharePct > 0) {
    const existing = await getTotalDistributionSharePct(id);
    if (existing + data.sharePct > 100) {
      throw new Error(
        `Share % would exceed 100%. Other accounts total: ${existing.toFixed(2)}%, setting: ${data.sharePct}%`
      );
    }
  }
  return updateAccount(id, data);
}
