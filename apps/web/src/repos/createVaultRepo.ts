import type { VaultRepo } from "./VaultRepo";
import { ApiVaultRepo } from "./ApiVaultRepo";

export async function createVaultRepo(): Promise<VaultRepo> {
  // Default: API repo (safe for production)
  if (process.env.NODE_ENV !== "production") {
    const mode = process.env.NEXT_PUBLIC_VAULT_REPO_MODE || "fixture";
    if (mode === "fixture") {
      // IMPORTANT: Keep this import inside NODE_ENV !== 'production' so it is not shipped in prod builds.
      const mod = await import("./FixtureVaultRepo");
      return new mod.FixtureVaultRepo();
    }
  }

  return new ApiVaultRepo();
}

