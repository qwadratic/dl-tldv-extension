/**
 * Caesar decipher: shift each letter forward by +offset.
 * A-Z and a-z wrap around. Digits and other chars unchanged.
 * This decodes tldv's obfuscated segment URL paths.
 */
export function caesarDecipher(text: string, offset: number): string {
  // Normalize offset to 0-25
  const shift = ((offset % 26) + 26) % 26;
  return text
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      // Uppercase A-Z
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + shift) % 26) + 65);
      }
      // Lowercase a-z
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + shift) % 26) + 97);
      }
      // Everything else (digits, symbols) unchanged
      return ch;
    })
    .join("");
}
