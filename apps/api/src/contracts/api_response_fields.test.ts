import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("api_response_fields.json", () => {
  it("is valid and declares /health fields", async () => {
    const url = new URL("./api_response_fields.json", import.meta.url);
    const txt = await fs.readFile(url, "utf8");
    const parsed = JSON.parse(txt);

    expect(parsed).toHaveProperty("endpoints");
    expect(Array.isArray(parsed.endpoints)).toBe(true);

    const health = parsed.endpoints.find((e: any) => e.id === "health");
    expect(health).toBeTruthy();
    expect(health.method).toBe("GET");
    expect(health.path).toBe("/health");
    expect(health.responseFields).toEqual(["ok", "service", "request_id"]);
  });
});

