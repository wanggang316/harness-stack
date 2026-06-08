import { describe, expect, it } from "vitest";
import { parseAssertionIds, withStatus } from "../src/core.js";
import type { Feature } from "../src/schema.js";

describe("parseAssertionIds", () => {
  it("extracts VAL ids from H3 headings, ignores trailing text", () => {
    const md = [
      "## Area: Auth",
      "### VAL-AUTH-001: user can log in",
      "Some prose.",
      "### VAL-AUTH-002: validation errors",
      "## Cross-Area Flows",
      "### VAL-CROSS-001: cart survives auth"
    ].join("\n");
    expect(parseAssertionIds(md)).toEqual(["VAL-AUTH-001", "VAL-AUTH-002", "VAL-CROSS-001"]);
  });

  it("ignores non-### headings and malformed ids", () => {
    const md = [
      "# VAL-NOPE-001 (h1, not an assertion)",
      "## VAL-NOPE-002 (h2)",
      "### VAL-auth-001 (lowercase area)",
      "### VAL-AUTH-1 (too few digits)",
      "### VAL-AUTH-001 ok"
    ].join("\n");
    expect(parseAssertionIds(md)).toEqual(["VAL-AUTH-001"]);
  });

  it("dedups while preserving first-seen order", () => {
    const md = "### VAL-A-001\n### VAL-B-001\n### VAL-A-001";
    expect(parseAssertionIds(md)).toEqual(["VAL-A-001", "VAL-B-001"]);
  });
});

describe("withStatus", () => {
  const feat = (id: string, status: Feature["status"] = "pending"): Feature => ({
    id,
    description: id,
    agent: "implementer",
    milestone: "m1",
    preconditions: [],
    expectedBehavior: [],
    verificationSteps: [],
    fulfills: [],
    status
  });

  it("moves a completed feature to the bottom", () => {
    const list = [feat("a"), feat("b"), feat("c")];
    const next = withStatus(list, "a", "completed");
    expect(next.map((f) => f.id)).toEqual(["b", "c", "a"]);
    expect(next[2]?.status).toBe("completed");
  });

  it("moves a cancelled feature to the bottom", () => {
    const list = [feat("a"), feat("b")];
    expect(withStatus(list, "a", "cancelled").map((f) => f.id)).toEqual(["b", "a"]);
  });

  it("updates non-terminal status in place", () => {
    const list = [feat("a"), feat("b")];
    const next = withStatus(list, "a", "in_progress");
    expect(next.map((f) => f.id)).toEqual(["a", "b"]);
    expect(next[0]?.status).toBe("in_progress");
  });

  it("throws on unknown id", () => {
    expect(() => withStatus([feat("a")], "ghost", "completed")).toThrow(/not found/);
  });
});
