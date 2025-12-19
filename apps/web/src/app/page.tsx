"use client";

import React, { useEffect, useState } from "react";
import { APP_DISPLAY_NAME } from "@/constants/branding";
import { createVaultRepo } from "@/repos/createVaultRepo";
import type { VaultSummary } from "@/repos/VaultRepo";

export default function HomePage() {
  const [items, setItems] = useState<VaultSummary[]>([]);

  useEffect(() => {
    createVaultRepo().then((repo) => repo.listSummaries()).then(setItems);
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>{APP_DISPLAY_NAME}</h1>
      <p>S00 scaffold. Use <code>NEXT_PUBLIC_VAULT_REPO_MODE=fixture</code> in dev to see synthetic data.</p>
      <ul>
        {items.map((it) => (
          <li key={it.id}>
            <code>{it.timeline_sort_key}</code> — {it.label}
          </li>
        ))}
      </ul>
    </main>
  );
}

