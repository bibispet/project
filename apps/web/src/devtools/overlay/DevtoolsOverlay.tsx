"use client";

import React from "react";
import { DEVTOOLS_SENTINEL } from "./DEVTOOLS_SENTINEL";

export function DevtoolsOverlay() {
  // Reference sentinel so it would be present if this file is ever bundled in production.
  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        padding: 10,
        border: "1px solid #999",
        background: "rgba(255,255,255,0.9)",
        fontSize: 12,
        zIndex: 9999
      }}
    >
      <div><strong>Devtools</strong></div>
      <div style={{ opacity: 0.6 }}>{DEVTOOLS_SENTINEL}</div>
    </div>
  );
}

