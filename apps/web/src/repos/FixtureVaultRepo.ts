import type { VaultRepo, VaultSummary } from "./VaultRepo";
import fixture from "../fixtures/fixture_vault.json";

export class FixtureVaultRepo implements VaultRepo {
  async listSummaries(): Promise<VaultSummary[]> {
    return fixture.summaries as VaultSummary[];
  }
}

