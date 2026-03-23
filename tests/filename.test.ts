import { describe, test, expect } from "vitest";
import { sanitizeName, buildFilename } from "../src/pipeline/filename";

describe("sanitizeName", () => {
  test("replaces spaces with underscores", () => {
    expect(sanitizeName("Weekly Sync")).toBe("Weekly_Sync");
  });

  test("removes special characters", () => {
    expect(sanitizeName("Meeting! @#$ Test")).toBe("Meeting_Test");
  });

  test("preserves dashes and underscores", () => {
    expect(sanitizeName("Q1-Planning_Review")).toBe("Q1-Planning_Review");
  });

  test("collapses multiple spaces/underscores", () => {
    expect(sanitizeName("Too   many   spaces")).toBe("Too_many_spaces");
  });

  test("trims whitespace", () => {
    expect(sanitizeName("  padded  ")).toBe("padded");
  });

  test("returns Untitled for empty string", () => {
    expect(sanitizeName("")).toBe("Untitled");
  });

  test("returns Untitled for whitespace-only string", () => {
    expect(sanitizeName("   ")).toBe("Untitled");
  });

  test("truncates to 100 characters", () => {
    const longName = "A".repeat(150);
    expect(sanitizeName(longName).length).toBeLessThanOrEqual(100);
  });

  test("handles slashes and parentheses", () => {
    const result = sanitizeName("Meeting with John/Jane (recap)");
    expect(result).not.toContain("/");
    expect(result).not.toContain("(");
    expect(result).not.toContain(")");
  });
});

describe("buildFilename", () => {
  test("produces YYYY-MM-DD_Name.mp4 format", () => {
    expect(buildFilename("Team Standup", "2025-06-15T10:30:00.000Z"))
      .toBe("2025-06-15_Team_Standup.mp4");
  });

  test("handles ISO date without time", () => {
    expect(buildFilename("Sync", "2025-01-01")).toMatch(/^2025-0[01]-\d{2}_Sync\.mp4$/);
  });

  test("uses unknown-date for invalid date", () => {
    expect(buildFilename("Meeting", "not-a-date"))
      .toBe("unknown-date_Meeting.mp4");
  });

  test("sanitizes meeting name in filename", () => {
    expect(buildFilename("My Meeting! #1", "2025-03-20T00:00:00Z"))
      .toBe("2025-03-20_My_Meeting_1.mp4");
  });

  test("handles empty meeting name", () => {
    expect(buildFilename("", "2025-03-20T00:00:00Z"))
      .toBe("2025-03-20_Untitled.mp4");
  });
});
