const DELIMITERS = new Set([",", "/", "(", ")", ":", "{", "}", '"', "\\", "~"]);

export function LiftographWrite_quote(value: string): string {
  if (!Array.from(value).some((char) => DELIMITERS.has(char))) {
    return value;
  }
  let escaped = "";
  for (const char of value) {
    escaped += char === '"' || char === "\\" ? `\\${char}` : char;
  }
  return `"${escaped}"`;
}
