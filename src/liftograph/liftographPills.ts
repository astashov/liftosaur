import { ILiftographDocument, LiftographDocument_scripts } from "./liftographDocument";

export interface ILiftographPill {
  label: string;
  insert: string;
}

function pills(labels: string[]): ILiftographPill[] {
  return labels.map((label) => ({ label, insert: label }));
}

const linePills: ILiftographPill[] = [
  { label: "graph {", insert: "graph {\n  name: / source: exercise() / y: e1rm\n}" },
  { label: "value", insert: "value / name: / source: exercise() / y: e1rm / compare: 4w" },
  { label: "row {", insert: "row {\n\n}" },
  { label: "// text", insert: "// " },
];
const sourcePills = pills(["exercise(", "workout", "stats(weight)"]);
const scriptPills = pills(["point(", "max(", "e1rm", "completedReps", "completedWeights", "var."]);
const presetsBySource: Record<"exercise" | "workout" | "stats", string[]> = {
  exercise: ["e1rm", "maxWeight", "volume", "maxReps"],
  workout: ["volume", "duration", "muscleSets(", "muscleVolume("],
  stats: ["value"],
};
const keys = ["name", "source", "y", "group", "smooth", "mark", "axis"];

function lineAt(text: string, caret: number): { before: string; line: string } {
  const start = text.lastIndexOf("\n", caret - 1) + 1;
  const endIndex = text.indexOf("\n", caret);
  const end = endIndex === -1 ? text.length : endIndex;
  return { before: text.slice(start, caret), line: text.slice(start, end) };
}

export function LiftographPills_forCaret(doc: ILiftographDocument, text: string, caret: number): ILiftographPill[] {
  if (LiftographDocument_scripts(doc).some((script) => caret >= script.textSpan.from && caret <= script.textSpan.to)) {
    return scriptPills;
  }
  const { before, line } = lineAt(text, caret);
  if (before.trim() === "") {
    return linePills;
  }
  if (/source:\s*$/.test(before)) {
    return sourcePills;
  }
  if (/\by:\s*$/.test(before)) {
    const source = /source:\s*workout/.test(line) ? "workout" : /source:\s*stats/.test(line) ? "stats" : "exercise";
    return pills(presetsBySource[source]);
  }
  const needsSeparator = !/\/\s*$/.test(before);
  return keys
    .filter((key) => !new RegExp(`(^|/)\\s*${key}:`).test(line))
    .map((key) => ({ label: `${key}:`, insert: `${needsSeparator ? " / " : ""}${key}: ` }));
}

export function LiftographPills_apply(
  text: string,
  caret: number,
  pill: ILiftographPill
): { from: number; to: number; insert: string; caret: number } {
  const insert = pill.insert.startsWith(" ") && text[caret - 1] === " " ? pill.insert.trimStart() : pill.insert;
  return { from: caret, to: caret, insert, caret: caret + insert.length };
}
