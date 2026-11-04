import type { Tree } from "@lezer/common";
import { IHistoryRecord, ISettings, statsLengthDef, statsPercentageDef, statsWeightDef } from "../types";
import { Exercise_findByName, Exercise_toKey } from "../models/exercise";
import { PlannerCompletions_rank, PlannerCompletionsIndex } from "../pages/planner/plannerCompletions";
import { ILiftographDocument } from "./liftographDocument";
import { LiftographCompile_aggs, LiftographCompile_keys, LiftographCompile_smoothAggs } from "./liftographCompile";
import { liftographPresets, LiftographPresets_isName } from "./liftographPresets";
import { LiftographScriptFns_muscleGroupKeys } from "./liftographScriptFns";
import { LiftographPalette_names } from "./liftographPalette";
import { LiftographEnvironment_forSource } from "./liftographEnvironments";
import {
  LiftographScriptSyntax_contextAt,
  LiftographScriptSyntax_pointArity,
  LiftographScriptSyntax_stateKeys,
} from "./liftographScriptSyntax";
import { LiftographWrite_quote } from "./liftographWrite";
import {
  ILiftographCompletionContext,
  ILiftographCompletionOwner,
  LiftographCompletionContext_nodeBefore,
  LiftographCompletionContext_resolve,
} from "./liftographCompletionContext";
import * as T from "./liftographParser.terms";

export type ILiftographCompletionHost = "popup" | "strip";

export type ILiftographCompletionKind =
  | "kind"
  | "key"
  | "nextKey"
  | "source"
  | "exercise"
  | "program"
  | "label"
  | "filter"
  | "stat"
  | "preset"
  | "muscleGroup"
  | "agg"
  | "duration"
  | "enum"
  | "script";

export interface ILiftographCompletionOption {
  label: string;
  type: string;
  insert?: string;
  caret?: number;
  detail?: string;
  display?: string;
  boost?: number;
}

export interface ILiftographCompletion {
  kind: ILiftographCompletionKind;
  from: number;
  to: number;
  match: { from: number; to: number };
  query: string;
  options: ILiftographCompletionOption[];
}

export interface ILiftographCompletionArgs {
  doc: ILiftographDocument;
  settings: ISettings;
  index: PlannerCompletionsIndex;
  scriptTrees: (script: string) => Tree;
  programNames: string[];
  labelsByExercise: Partial<Record<string, string[]>>;
  host: ILiftographCompletionHost;
  explicit?: boolean;
}

type IContext<K extends ILiftographCompletionContext["type"]> = Extract<ILiftographCompletionContext, { type: K }>;

export interface ILiftographCandidates {
  kind: ILiftographCompletionKind;
  from: number;
  to: number;
  matchFrom?: number;
  options: ILiftographCompletionOption[];
  isOrdered?: boolean;
}

export const LiftographCompletions_musclesTemplate = "muscles / range: 7d / show: map, sets";
export const LiftographCompletions_calendarTemplate = "calendar / range: 3m";

const STRIP_LIMIT = 30;
const STATS_KEYS: readonly string[] = [...statsWeightDef, ...statsLengthDef, ...statsPercentageDef];
const GROUP_DURATIONS = ["1w", "2w", "4w", "1m", "3m"];
const SMOOTH_WINDOWS = ["1w", "4w", "3m", "3", "5", "10"];
const VALUES_BY_KEY: Partial<Record<string, string[]>> = {
  compare: ["1w", "4w", "3m"],
  trend: ["1m", "3m", "6m", "1y"],
  mark: ["line", "dots", "bars"],
  axis: ["left", "right"],
  color: [...LiftographPalette_names],
};
const SHOW_VALUES = ["map", "sets", "map, sets"];
const RANGES: Record<ILiftographCompletionOwner, string[]> = {
  series: [],
  graph: ["1m", "3m", "6m", "1y", "all"],
  value: [],
  muscles: ["7d", "2w", "4w"],
  calendar: ["1m", "3m", "6m", "1y"],
};
const FILTERS: Partial<Record<string, string[]>> = {
  workout: ["program", "day"],
  exercise: ["program", "label", "day"],
};
const OPENERS = [T.Sep, T.Colon, T.OpenParen, T.Comma];

function option(
  label: string,
  type: string,
  extra: Partial<ILiftographCompletionOption> = {}
): ILiftographCompletionOption {
  return { label, type, ...extra };
}

function withCaret(
  label: string,
  beforeCaret: string,
  afterCaret: string,
  type: string,
  detail?: string
): ILiftographCompletionOption {
  return option(label, type, { insert: beforeCaret + afterCaret, caret: beforeCaret.length, detail });
}

function callOption(name: string, hasParens: boolean, detail: string): ILiftographCompletionOption {
  return hasParens ? option(name, "function") : withCaret(name, `${name}(`, ")", "function", detail);
}

function templates(context: IContext<"kind">): ILiftographCompletionOption[] {
  const nl = `\n${context.indent}`;
  const result = [
    withCaret("graph", `graph {${nl}  name: `, ` / source: exercise() / y: e1rm${nl}}`, "keyword", "{…}"),
    withCaret("value", "value / name: ", " / source: exercise() / y: e1rm / compare: 4w", "keyword", "/ …"),
    option("muscles", "keyword", { insert: LiftographCompletions_musclesTemplate, detail: "/ …" }),
    option("calendar", "keyword", { insert: LiftographCompletions_calendarTemplate, detail: "/ …" }),
    option("//", "text", { insert: "// ", display: "// text", detail: "text" }),
  ];
  if (!context.isInRow) {
    result.push(withCaret("row", `row {${nl}  `, `${nl}}`, "keyword", "{…}"));
  }
  return result;
}

function kindCandidates(context: IContext<"kind">): ILiftographCandidates {
  return {
    kind: "kind",
    from: context.from,
    to: context.to,
    options: context.isAlone
      ? templates(context)
      : ["graph", "value", "muscles", "calendar", "row"].map((kind) => option(kind, "keyword")),
  };
}

function keyCandidates(context: IContext<"key">): ILiftographCandidates {
  return {
    kind: "key",
    from: context.from,
    to: context.to,
    options: LiftographCompile_keys[context.owner]
      .filter((key) => context.present.indexOf(key) === -1)
      .map((key) => option(key, "property", { insert: context.hasColonAfter ? key : `${key}: ` })),
  };
}

function nextKeyCandidates(context: IContext<"nextKey">): ILiftographCandidates {
  return {
    kind: "nextKey",
    from: context.pos,
    to: context.pos,
    options: LiftographCompile_keys[context.owner]
      .filter((key) => context.present.indexOf(key) === -1)
      .map((key) => option(`${key}:`, "property", { insert: `/ ${key}: ` })),
  };
}

export function LiftographCompletions_programNames(history: IHistoryRecord[]): string[] {
  const byKey = new Map<string, string>();
  for (const record of [...history].sort((a, b) => b.startTime - a.startTime)) {
    const name = record.programName.trim();
    const key = name.toLowerCase();
    if (name !== "" && !byKey.has(key)) {
      byKey.set(key, name);
    }
  }
  return Array.from(byKey.values());
}

export function LiftographCompletions_labelsByExercise(history: IHistoryRecord[]): Partial<Record<string, string[]>> {
  const result: Partial<Record<string, string[]>> = {};
  for (const record of [...history].sort((a, b) => b.startTime - a.startTime)) {
    for (const entry of record.entries) {
      const suffix = `-${Exercise_toKey(entry.exercise)}`.toLowerCase();
      const key = entry.programExerciseId;
      if (key == null || !key.endsWith(suffix) || key.length === suffix.length) {
        continue;
      }
      const label = key.slice(0, -suffix.length);
      const labels = result[entry.exercise.id] ?? [];
      if (labels.indexOf(label) === -1) {
        result[entry.exercise.id] = [...labels, label];
      }
    }
  }
  return result;
}

function labelOptions(firstArg: string | undefined, args: ILiftographCompletionArgs): ILiftographCompletionOption[] {
  const exercise = firstArg != null ? Exercise_findByName(firstArg, args.settings.exercises) : undefined;
  const labels = exercise != null ? (args.labelsByExercise[exercise.id] ?? []) : [];
  return labels.map((label, i) =>
    option(label, "constant", { insert: LiftographWrite_quote(label), boost: labels.length - i })
  );
}

function filterOptions(context: IContext<"argument">, start: number): ILiftographCompletionOption[] {
  return (FILTERS[context.fn] ?? [])
    .filter((name) => context.present.indexOf(name) === -1)
    .map((name, i) =>
      option(`${name}:`, "property", { insert: context.hasColonAfter ? name : `${name}: `, boost: start - i })
    );
}

function isNumericX(script: string | undefined, args: ILiftographCompletionArgs): boolean {
  return script != null && LiftographScriptSyntax_pointArity(args.scriptTrees(script), script).has(2);
}

function argumentCandidates(
  context: IContext<"argument">,
  args: ILiftographCompletionArgs
): ILiftographCandidates | undefined {
  const base = { from: context.from, to: context.to, matchFrom: context.matchFrom };
  const constants = (kind: ILiftographCompletionKind, values: string[]): ILiftographCandidates => ({
    ...base,
    kind,
    options: values.map((v) => option(v, "constant")),
  });
  const isSource = context.key === "source";
  if (isSource && context.namedKey === "program") {
    return {
      ...base,
      kind: "program",
      options: args.programNames.map((name, i) =>
        option(name, "constant", { insert: LiftographWrite_quote(name), boost: args.programNames.length - i })
      ),
      isOrdered: true,
    };
  } else if (isSource && context.fn === "exercise" && context.namedKey === "label") {
    return { ...base, kind: "label", options: labelOptions(context.firstArg, args), isOrdered: true };
  } else if (context.namedKey != null) {
    return undefined;
  } else if (isSource && context.hasColonAfter) {
    return { ...base, kind: "filter", options: filterOptions(context, 2) };
  } else if (isSource && context.fn === "stats") {
    return context.argIndex === 0 ? constants("stat", [...STATS_KEYS]) : undefined;
  } else if (isSource && context.fn === "workout") {
    return { ...base, kind: "filter", options: filterOptions(context, 2) };
  } else if (isSource && context.fn === "exercise" && context.argIndex === 0) {
    return {
      ...base,
      kind: "exercise",
      options: args.index
        .searchNames("", args.settings.exercises)
        .map((name) => option(name, "keyword", { insert: LiftographWrite_quote(name) })),
    };
  } else if (isSource && context.fn === "exercise") {
    return {
      ...base,
      kind: "filter",
      options: filterOptions(context, 0),
      isOrdered: true,
    };
  } else if (context.key === "y" && LiftographPresets_isName(context.fn) && liftographPresets[context.fn].hasArg) {
    return constants("muscleGroup", Array.from(LiftographScriptFns_muscleGroupKeys(args.settings)));
  } else if (context.key === "show" && context.fn === "sets") {
    return constants(
      "muscleGroup",
      Array.from(LiftographScriptFns_muscleGroupKeys(args.settings)).filter((group) => group !== "total")
    );
  } else if (context.key === "group" && LiftographCompile_aggs.some((agg) => agg === context.fn)) {
    return isNumericX(context.script, args) ? undefined : constants("duration", GROUP_DURATIONS);
  } else if (context.key === "smooth" && LiftographCompile_smoothAggs.some((agg) => agg === context.fn)) {
    return constants("duration", isNumericX(context.script, args) ? SMOOTH_WINDOWS.slice(3) : SMOOTH_WINDOWS);
  }
  return undefined;
}

function valueCandidates(
  context: IContext<"value">,
  args: ILiftographCompletionArgs
): ILiftographCandidates | undefined {
  const { from, to, key, hasParens } = context;
  const simple = (kind: ILiftographCompletionKind, values: string[]): ILiftographCandidates => ({
    kind,
    from,
    to,
    options: values.map((v) => option(v, "constant")),
  });
  if (key === "source") {
    return {
      kind: "source",
      from,
      to,
      options: [
        callOption("exercise", hasParens, "(…)"),
        option("workout", "function"),
        ...(hasParens ? [] : [withCaret("workout()", "workout(", ")", "function", "filters")]),
        callOption("stats", hasParens, "(…)"),
      ],
    };
  } else if (key === "y") {
    const presets = Object.values(liftographPresets).filter(
      (p) => context.sourceType == null || p.sources.indexOf(context.sourceType) !== -1
    );
    return {
      kind: "preset",
      from,
      to,
      options: presets.map((p) => (p.hasArg ? callOption(p.name, hasParens, "(group)") : option(p.name, "function"))),
    };
  } else if (key === "group" || key === "smooth") {
    const numeric = isNumericX(context.script, args);
    const names = key === "group" ? LiftographCompile_aggs : LiftographCompile_smoothAggs;
    return {
      kind: "agg",
      from,
      to,
      options: names.map((name) =>
        key === "group" && numeric ? option(name, "function") : callOption(name, hasParens, "(…)")
      ),
    };
  } else if (key === "range") {
    return simple("duration", RANGES[context.owner]);
  }
  if (key === "show") {
    return {
      kind: "enum",
      from,
      to,
      options: [
        ...SHOW_VALUES.map((v) => option(v, "constant")),
        withCaret("map, sets(…)", "map, sets(", ")", "constant", "groups"),
      ],
    };
  }
  const values = VALUES_BY_KEY[key];
  return values != null ? simple(key === "compare" || key === "trend" ? "duration" : "enum", values) : undefined;
}

function scriptCandidates(
  context: IContext<"script">,
  pos: number,
  args: ILiftographCompletionArgs
): ILiftographCandidates | undefined {
  const { source, offset } = context;
  const tree = args.scriptTrees(source);
  const at = LiftographScriptSyntax_contextAt(tree, source, pos - offset);
  if (at.kind === "muscleGroup") {
    return {
      kind: "muscleGroup",
      from: at.from + offset,
      to: at.to + offset,
      options: Array.from(LiftographScriptFns_muscleGroupKeys(args.settings)).map((k) => option(k, "constant")),
    };
  } else if (at.kind === "stateKey") {
    return {
      kind: "script",
      from: at.from + offset,
      to: at.to + offset,
      options: LiftographScriptSyntax_stateKeys(tree, source).map((k) => option(k, "variable")),
    };
  } else if (at.kind === "word") {
    const environment = LiftographEnvironment_forSource(context.sourceType ?? "exercise");
    return {
      kind: "script",
      from: at.from + offset,
      to: at.to + offset,
      options: [
        option("state", "keyword"),
        ...Object.keys(environment.bindingTypes).map((name) => option(name, "variable")),
        ...Array.from(environment.fnNames).map((name) => option(name, "function")),
      ],
    };
  }
  return undefined;
}

export function LiftographCompletions_candidates(
  pos: number,
  args: ILiftographCompletionArgs
): ILiftographCandidates | undefined {
  const context = LiftographCompletionContext_resolve(args.doc, pos);
  switch (context?.type) {
    case "kind":
      return kindCandidates(context);
    case "key":
      return keyCandidates(context);
    case "nextKey":
      return args.host === "strip" ? nextKeyCandidates(context) : undefined;
    case "value":
      return valueCandidates(context, args);
    case "argument":
      return argumentCandidates(context, args);
    case "script":
      return scriptCandidates(context, pos, args);
    default:
      return undefined;
  }
}

function opensOnEmpty(doc: ILiftographDocument, pos: number): boolean {
  return OPENERS.indexOf(LiftographCompletionContext_nodeBefore(doc.tree, pos).type.id) !== -1;
}

export function LiftographCompletions_at(
  text: string,
  pos: number,
  args: ILiftographCompletionArgs
): ILiftographCompletion | undefined {
  const candidates = LiftographCompletions_candidates(pos, args);
  if (candidates == null || candidates.from > pos || candidates.to < pos) {
    return undefined;
  }
  const matchFrom = Math.min(candidates.matchFrom ?? candidates.from, pos);
  const query = text.slice(matchFrom, pos);
  if (
    args.host === "popup" &&
    !args.explicit &&
    query === "" &&
    candidates.kind !== "nextKey" &&
    !opensOnEmpty(args.doc, pos)
  ) {
    return undefined;
  }
  const options =
    args.host === "popup"
      ? candidates.options
      : candidates.isOrdered
        ? PlannerCompletions_rank(candidates.options, query)
            .sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0))
            .slice(0, STRIP_LIMIT)
        : PlannerCompletions_rank(candidates.options, query, STRIP_LIMIT);
  if (options.length === 0) {
    return undefined;
  }
  return {
    kind: candidates.kind,
    from: candidates.from,
    to: candidates.to,
    match: { from: matchFrom, to: pos },
    query,
    options,
  };
}

export function LiftographCompletions_edit(
  range: { from: number; to: number },
  picked: ILiftographCompletionOption
): { from: number; to: number; insert: string; caret: number } {
  const insert = picked.insert ?? picked.label;
  return { from: range.from, to: range.to, insert, caret: range.from + (picked.caret ?? insert.length) };
}

export function LiftographCompletions_editTyped(
  completion: ILiftographCompletion,
  picked: ILiftographCompletionOption,
  typedTo: number
): { from: number; to: number; insert: string; caret: number } {
  return LiftographCompletions_edit({ from: completion.from, to: Math.max(completion.to, typedTo) }, picked);
}

export interface ILiftographEditorSnapshot {
  text: string;
  start: number;
  end: number;
}

export function LiftographCompletions_tap(
  snapshot: ILiftographEditorSnapshot,
  current: ILiftographCompletion | undefined,
  picked: ILiftographCompletionOption
): { edit: { from: number; to: number; insert: string; caret: number }; next: ILiftographEditorSnapshot } | undefined {
  const edit = snapshot.start === snapshot.end ? LiftographCompletions_apply(current, picked) : undefined;
  if (edit == null) {
    return undefined;
  }
  const text = snapshot.text.slice(0, edit.from) + edit.insert + snapshot.text.slice(edit.to);
  return { edit, next: { text, start: edit.caret, end: edit.caret } };
}

export function LiftographCompletions_apply(
  current: ILiftographCompletion | undefined,
  picked: ILiftographCompletionOption
): { from: number; to: number; insert: string; caret: number } | undefined {
  const match = current?.options.find((o) => o.label === picked.label && o.insert === picked.insert);
  if (current == null || match == null) {
    return undefined;
  }
  return LiftographCompletions_edit(current, match);
}
