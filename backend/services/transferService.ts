import { findAllTransfers, findTransferById, createTransferTx, reverseTransferTx } from "@backend/repositories/transferRepository";
import type { CreateTransferInput } from "@backend/validators/transferValidator";

export const listTransfers   = (period?: string) => findAllTransfers(period);
export const getTransfer     = (id: string)      => findTransferById(id);
export const createTransfer  = (input: CreateTransferInput, createdById: string) => createTransferTx(input, createdById);
export const reverseTransfer = (id: string, createdById: string) => reverseTransferTx(id, createdById);
