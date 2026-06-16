import {
  findAllAccounts,
  findAccountById,
  createAccount,
  updateAccount,
  getTotalSharePctByType,
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
    const existing = await getTotalSharePctByType(data.type);
    const limit = data.type === "company_reserve" ? 99.99 : 100;
    if (existing + data.sharePct > limit) {
      throw new Error(
        `Share % would exceed 100% for ${data.type === "company_reserve" ? "company reserve" : "stakeholder"} accounts. ` +
        `Current total: ${existing.toFixed(2)}%, adding: ${data.sharePct}%`
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
  const current = await findAccountById(id);
  if (!current) return null;

  if (data.sharePct !== undefined && data.sharePct > 0) {
    const accountType = current.type as "stakeholder" | "company_reserve" | "operating";
    if (accountType === "stakeholder" || accountType === "company_reserve") {
      const existing = await getTotalSharePctByType(accountType, id);
      const limit = accountType === "company_reserve" ? 99.99 : 100;
      if (existing + data.sharePct > limit) {
        throw new Error(
          `Share % would exceed 100% for ${accountType === "company_reserve" ? "company reserve" : "stakeholder"} accounts. ` +
          `Other accounts total: ${existing.toFixed(2)}%, setting: ${data.sharePct}%`
        );
      }
    }
  }
  return updateAccount(id, data);
}
