"use client";

import React, { useEffect, useState } from "react";
import { isDevtoolsEnabled } from "./devtoolsGate";

export function DevtoolsLoader() {
  const [Overlay, setOverlay] = useState<null | React.ComponentType>(null);

  useEffect(() => {
    if (!isDevtoolsEnabled({ nodeEnv: process.env.NODE_ENV, search: window.location.search })) {
      return;
    }

    // IMPORTANT: Keep the dynamic import inside a NODE_ENV !== 'production' block
    // so production builds can tree-shake devtools code.
    if (process.env.NODE_ENV !== "production") {
      import("./overlay/DevtoolsOverlay").then((mod) => {
        setOverlay(() => mod.DevtoolsOverlay);
      });
    }
  }, []);

  if (!Overlay) return null;
  return <Overlay />;
}

