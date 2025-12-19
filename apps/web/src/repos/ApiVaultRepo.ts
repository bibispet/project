import type { VaultRepo, VaultSummary } from "./VaultRepo";

export class ApiVaultRepo implements VaultRepo {
  async listSummaries(): Promise<VaultSummary[]> {
    // S00 stub: API integration comes later. Keep it empty and safe.
    return [];
  }
}

