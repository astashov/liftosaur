import { LiftographDocument_parse, LiftographDocument_valueText } from "./liftographDocument";

const DELIMITERS = new Set([",", "/", "(", ")", ":", "{", "}", '"', "\\", "~"]);

function readsBackAs(value: string): string | undefined {
  const item = LiftographDocument_parse(`value / x: ${value}`).items[0];
  const pairs = item?.type === "widget" ? item.pairs : [];
  const pair = pairs[0];
  if (pairs.length !== 1 || pair?.value == null) {
    return undefined;
  }
  return LiftographDocument_valueText(pair.value);
}

export function LiftographWrite_quote(value: string): string {
  const hasDelimiter = Array.from(value).some((char) => DELIMITERS.has(char));
  if (!hasDelimiter && readsBackAs(value) === value) {
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
