import { IProgramIndexEntry } from "../../src/models/program";
import {
  builtinProgramAges,
  builtinProgramDurations,
  builtinProgramFrequencies,
  builtinProgramGoals,
} from "../../src/models/builtinPrograms";

const host = "https://www.liftosaur.com";
const markdownSuffix = ".md";

export interface IProgramMarkdownInput {
  indexEntry: IProgramIndexEntry;
  fullDescription?: string;
  faq?: string;
  programText?: string;
}

export function ProgramMarkdown_parseRouteId(routeId: string): { id: string; isMarkdown: boolean } {
  if (routeId.endsWith(markdownSuffix) && routeId.length > markdownSuffix.length) {
    return { id: routeId.slice(0, -markdownSuffix.length), isMarkdown: true };
  }
  return { id: routeId, isMarkdown: false };
}

export function ProgramMarkdown_url(id: string): string {
  return `${host}/programs/${id}${markdownSuffix}`;
}

export function ProgramMarkdown_linkHeader(id: string): string {
  return `<${ProgramMarkdown_url(id)}>; rel="alternate"; type="text/markdown"`;
}

export function ProgramMarkdown_render(input: IProgramMarkdownInput): string {
  const { indexEntry } = input;
  const sections: string[] = [`# ${indexEntry.name}`];
  if (indexEntry.shortDescription.trim()) {
    sections.push(`> ${indexEntry.shortDescription.trim().replace(/\s+/g, " ")}`);
  }
  sections.push(facts(indexEntry).join("\n"));
  for (const text of [indexEntry.description, input.fullDescription]) {
    const cleaned = text != null ? cleanDescription(text) : "";
    if (cleaned) {
      sections.push(cleaned);
    }
  }
  const faq = input.faq != null ? cleanDescription(input.faq) : "";
  if (faq) {
    sections.push(`## FAQ\n\n${faq}`);
  }
  if (input.programText?.trim()) {
    const fence = fenceFor(input.programText);
    sections.push(
      [
        "## Program in Liftoscript",
        `This is the full program source. The language reference is at ${host}/doc/liftoscript.`,
        `${fence}liftoscript\n${input.programText.trim()}\n${fence}`,
      ].join("\n\n")
    );
  }
  return sections.join("\n\n") + "\n";
}

function facts(entry: IProgramIndexEntry): string[] {
  const lines: string[] = [];
  if (entry.author) {
    lines.push(`- Author: ${entry.author}`);
  }
  const frequency = entry.frequency != null ? label(builtinProgramFrequencies, String(entry.frequency)) : undefined;
  if (frequency) {
    lines.push(`- Frequency: ${frequency}`);
  }
  const duration = label(builtinProgramDurations, entry.duration);
  if (duration) {
    lines.push(`- Workout length: ${duration}`);
  }
  const goal = label(builtinProgramGoals, entry.goal);
  if (goal) {
    lines.push(`- Goal: ${goal}`);
  }
  const age = label(builtinProgramAges, entry.age);
  if (age) {
    lines.push(`- Training experience: ${age}`);
  }
  if (entry.weeksCount != null && entry.weeksCount > 1) {
    lines.push(`- Length: ${entry.weeksCount} weeks`);
  }
  lines.push(`- Web page: ${host}/programs/${entry.id}`);
  return lines;
}

function label(labels: Record<string, string>, key: string | undefined): string | undefined {
  return key != null && Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : undefined;
}

function cleanDescription(text: string): string {
  return text
    .replace(/<!--\s*more\s*-->/g, "")
    .replace(/^:::exercise-example\{[^}]*\}[ \t]*$\n?/gm, "")
    .replace(/\[\{([^}]+)\}\]/g, (_match, name: string) => name.trim())
    .replace(/\]\(\/(?!\/)/g, `](${host}/`)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fenceFor(text: string): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) || []).map((run) => run.length));
  return "`".repeat(Math.max(3, longestRun + 1));
}
