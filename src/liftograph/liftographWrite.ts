const DELIMITERS = new Set([",", "/", "(", ")", ":", "{", "}", '"', "\\", "~"]);

export function LiftographWrite_quote(value: string): string {
  if (!Array.from(value).some((char) => DELIMITERS.has(char))) {
    return value;
  }
  return LiftographWrite_quoted(value);
}

export function LiftographWrite_quoted(value: string): string {
  let escaped = "";
  for (const char of value) {
    escaped += char === '"' || char === "\\" ? `\\${char}` : char;
  }
  return `"${escaped}"`;
}
