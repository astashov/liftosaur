import { content as changelogMarkdown } from "../generated/whatsnew";

export interface IWhatsNewEntry {
  dateStr: string;
  title: string;
  body: string;
}

let cached: IWhatsNewEntry[] | undefined;

export function WhatsNewParser_parseAll(): IWhatsNewEntry[] {
  if (cached) {
    return cached;
  }
  cached = parse(changelogMarkdown);
  return cached;
}

function parse(source: string): IWhatsNewEntry[] {
  const lines = source.split(/\r?\n/);
  const entries: IWhatsNewEntry[] = [];

  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() !== "---") {
      i += 1;
      continue;
    }
    i += 1;

    const meta: Record<string, string> = {};
    while (i < lines.length && lines[i].trim() !== "---") {
      const line = lines[i];
      const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
      if (match) {
        meta[match[1].toLowerCase()] = match[2].trim();
      }
      i += 1;
    }
    if (i >= lines.length) {
      break;
    }
    i += 1;

    const bodyLines: string[] = [];
    while (i < lines.length) {
      if (lines[i].trim() === "---" && isFrontmatterStart(lines, i)) {
        break;
      }
      bodyLines.push(lines[i]);
      i += 1;
    }

    const dateRaw = meta.date || "";
    const dateStr = dateRaw.replace(/-/g, "");
    const title = meta.title || "";
    if (!/^\d{8}$/.test(dateStr)) {
      continue;
    }
    entries.push({
      dateStr,
      title,
      body: bodyLines.join("\n").trim(),
    });
  }

  return entries;
}

function isFrontmatterStart(lines: string[], idx: number): boolean {
  for (let j = idx + 1; j < lines.length; j += 1) {
    const trimmed = lines[j].trim();
    if (trimmed === "---") {
      return true;
    }
    if (trimmed === "") {
      return false;
    }
    if (!/^[A-Za-z][A-Za-z0-9_-]*\s*:/.test(trimmed)) {
      return false;
    }
  }
  return false;
}
