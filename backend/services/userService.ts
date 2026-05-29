import bcrypt from "bcryptjs";
import {
  findAllUsers,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  userExists,
  deleteUser,
} from "@backend/repositories/userRepository";
import type { CreateUserInput, UpdateUserInput, ListUsersInput } from "@backend/validators/userValidator";

const HASH_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;

export async function listUsers(input: ListUsersInput) {
  return findAllUsers(input);
}

export async function getUser(id: string) {
  return findUserById(id);
}

export async function addUser(data: CreateUserInput) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) throw new Error("A user with this email already exists");

  const passwordHash = await bcrypt.hash(data.password, HASH_ROUNDS);
  const { password: _, ...rest } = data;
  return createUser({ ...rest, email: normalizedEmail, passwordHash });
}

export async function editUser(id: string, data: UpdateUserInput) {
  const exists = await userExists(id);
  if (!exists) return null;

  if (data.email) {
    const normalizedEmail = data.email.toLowerCase().trim();
    data = { ...data, email: normalizedEmail };
    const existing = await findUserByEmail(normalizedEmail);
    if (existing && existing.id !== id) throw new Error("Email already in use by another user");
  }

  const updateData: UpdateUserInput & { passwordHash?: string } = { ...data };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, HASH_ROUNDS);
  }

  return updateUser(id, updateData);
}

export async function deactivateUser(id: string, requestingUserId: string): Promise<boolean> {
  const exists = await userExists(id);
  if (!exists) return false;
  if (id === requestingUserId) throw new Error("Cannot deactivate your own account");
  await updateUser(id, { status: "inactive" });
  return true;
}

export async function reactivateUser(id: string): Promise<boolean> {
  const exists = await userExists(id);
  if (!exists) return false;
  await updateUser(id, { status: "active" });
  return true;
}

export async function removeUser(id: string, requestingUserId: string): Promise<boolean> {
  if (id === requestingUserId) throw new Error("Cannot delete your own account");
  const exists = await userExists(id);
  if (!exists) return false;
  await deleteUser(id);
  return true;
}
