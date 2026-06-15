import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

// Use vi.stubEnv for proper env var management
async function getBranch() {
  return await import("./branch.js");
}

describe("getAllBranchIds", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("returns ['default'] when no env vars set", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "");
    vi.stubEnv("CHALY_BRANCH_ID", "");
    vi.stubEnv("VITE_HOUSEPYSBOT_BRANCH_ID", "");
    const { getAllBranchIds } = await getBranch();
    expect(getAllBranchIds()).toEqual(["default"]);
  });

  it("parses single branch from HOUSEPYSBOT_BRANCH_ID", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "castilla");
    const { getAllBranchIds } = await getBranch();
    expect(getAllBranchIds()).toEqual(["castilla"]);
  });

  it("parses multiple branches from comma-separated env var", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "castilla,san-isidro,miraflores");
    const { getAllBranchIds } = await getBranch();
    expect(getAllBranchIds()).toEqual(["castilla", "san-isidro", "miraflores"]);
  });

  it("trims whitespace around branch IDs", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "  castilla , san-isidro ");
    const { getAllBranchIds } = await getBranch();
    expect(getAllBranchIds()).toEqual(["castilla", "san-isidro"]);
  });

  it("filters out empty strings", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "castilla,,,miraflores,");
    const { getAllBranchIds } = await getBranch();
    expect(getAllBranchIds()).toEqual(["castilla", "miraflores"]);
  });

  it("falls back to CHALY_BRANCH_ID if HOUSEPYSBOT not set", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "");
    vi.stubEnv("CHALY_BRANCH_ID", "chalys-branch");
    const { getAllBranchIds } = await getBranch();
    expect(getAllBranchIds()).toEqual(["chalys-branch"]);
  });

  it("prefers HOUSEPYSBOT_BRANCH_ID over CHALY_BRANCH_ID", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "main");
    vi.stubEnv("CHALY_BRANCH_ID", "fallback");
    const { getAllBranchIds } = await getBranch();
    expect(getAllBranchIds()).toEqual(["main"]);
  });
});

describe("getPrimaryBranchId", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("returns first branch ID from list", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "alpha,beta,gamma");
    const { getPrimaryBranchId } = await getBranch();
    expect(getPrimaryBranchId()).toBe("alpha");
  });

  it("returns 'default' when no env var set", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "");
    const { getPrimaryBranchId } = await getBranch();
    expect(getPrimaryBranchId()).toBe("default");
  });

  it("returns the only branch when single", async () => {
    vi.stubEnv("HOUSEPYSBOT_BRANCH_ID", "unica");
    const { getPrimaryBranchId } = await getBranch();
    expect(getPrimaryBranchId()).toBe("unica");
  });
});
