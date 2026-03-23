import { describe, test, expect } from "vitest";
import { caesarDecipher } from "../src/pipeline/caesar";

describe("caesarDecipher", () => {
  test("shifts lowercase letters forward by offset", () => {
    expect(caesarDecipher("abc", 3)).toBe("def");
  });

  test("wraps lowercase letters around z", () => {
    expect(caesarDecipher("xyz", 3)).toBe("abc");
  });

  test("shifts uppercase letters forward by offset", () => {
    expect(caesarDecipher("ABC", 3)).toBe("DEF");
  });

  test("wraps uppercase letters around Z", () => {
    expect(caesarDecipher("XYZ", 3)).toBe("ABC");
  });

  test("full rotation (26) returns original", () => {
    expect(caesarDecipher("Hello", 26)).toBe("Hello");
  });

  test("digits are unchanged", () => {
    expect(caesarDecipher("abc123", 1)).toBe("bcd123");
  });

  test("special characters are unchanged", () => {
    expect(caesarDecipher("a-b.c?d=e&f", 1)).toBe("b-c.d?e=f&g");
  });

  test("offset 0 returns original", () => {
    expect(caesarDecipher("Hello World", 0)).toBe("Hello World");
  });

  test("decodes a realistic obfuscated segment filename", () => {
    // Encode "chunk" with shift -3 (i.e. +23): c->z, h->e, u->r, n->k, k->h => "zerkh"
    // Decode "zerkh" with shift +3: z->c, e->h, r->u, k->n, h->k => "chunk"
    expect(caesarDecipher("zerkh_000000.qp", 3)).toBe("chunk_000000.ts");
  });

  test("handles negative-equivalent offsets via modulo", () => {
    // offset 27 should behave like offset 1
    expect(caesarDecipher("abc", 27)).toBe("bcd");
  });
});
