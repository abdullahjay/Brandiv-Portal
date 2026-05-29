import {
  previewDistribution,
  runDistributionTx,
  findManyDistributions,
} from "@backend/repositories/distributionRepository";
import type { RunDistributionInput } from "@backend/validators/distributionValidator";

export async function getDistributionPreview() {
  return previewDistribution();
}

export async function runDistribution(input: RunDistributionInput, runById: string) {
  return runDistributionTx(input, runById);
}

export async function listDistributions() {
  return findManyDistributions();
}
