export function isDevtoolsEnabled(params: { nodeEnv: string | undefined; search: string }): boolean {
  const nodeEnv = params.nodeEnv ?? "development";
  if (nodeEnv === "production") return false;

  const sp = new URLSearchParams(params.search ?? "");
  return sp.get("dev") === "1";
}

