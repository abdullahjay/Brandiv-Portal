import * as repo from "@backend/repositories/clientRepository";
import type {
  CreateClientInput,
  UpdateClientInput,
  ListClientsInput,
} from "@backend/validators/clientValidator";

export async function listClients(input: ListClientsInput) {
  return repo.findManyClients(input);
}

export async function getClient(id: string) {
  const client = await repo.findClientById(id);
  if (!client) return null;
  return client;
}

export async function createClient(data: CreateClientInput, createdById: string) {
  return repo.createClient(data, createdById);
}

export async function updateClient(id: string, data: UpdateClientInput) {
  const exists = await repo.clientExists(id);
  if (!exists) return null;
  return repo.updateClient(id, data);
}

export async function archiveClient(id: string) {
  const exists = await repo.clientExists(id);
  if (!exists) return null;
  return repo.deleteClient(id);
}
