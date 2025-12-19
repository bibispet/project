export type VaultSummary = {
  id: string;
  timeline_sort_key: string;
  label: string;
};

export interface VaultRepo {
  listSummaries(): Promise<VaultSummary[]>;
}

