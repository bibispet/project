import { describe, expect, it } from "vitest";
import { isDevtoolsEnabled } from "./devtoolsGate";

describe("isDevtoolsEnabled", () => {
  it("is false in production regardless of query", () => {
    expect(isDevtoolsEnabled({ nodeEnv: "production", search: "?dev=1" })).toBe(false);
    expect(isDevtoolsEnabled({ nodeEnv: "production", search: "" })).toBe(false);
  });

  it("is true only when ?dev=1 and not production", () => {
    expect(isDevtoolsEnabled({ nodeEnv: "development", search: "?dev=1" })).toBe(true);
    expect(isDevtoolsEnabled({ nodeEnv: "development", search: "?dev=0" })).toBe(false);
    expect(isDevtoolsEnabled({ nodeEnv: "development", search: "" })).toBe(false);
  });
});

