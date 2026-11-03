import type { SyntaxNode } from "@lezer/common";
import type { ILiftoEditorContext, ILiftoEditorLevel, ITextEdit } from "../components/primitives/liftoEditorBrain";
import type { ILiftoEditorPill, ILiftoEditorPillCategory } from "../components/primitives/liftoEditorActions";
import {
  ILiftographDocument,
  ILiftographRowItem,
  ILiftographSeriesNode,
  ILiftographSpan,
  ILiftographTextItem,
  ILiftographWidgetItem,
  LiftographDocument_lineAt,
} from "./liftographDocument";
import { LiftographCompile_keys } from "./liftographCompile";
import {
  ILiftographCompletionArgs,
  ILiftographCompletionOption,
  LiftographCompletions_candidates,
} from "./liftographCompletions";
import { liftographPresets, LiftographPresets_isName } from "./liftographPresets";
import { LiftographPalette_names } from "./liftographPalette";
import { LiftographScriptSyntax_pointArity } from "./liftographScriptSyntax";
import { LiftographWrite_quote } from "./liftographWrite";
import * as T from "./liftographParser.terms";
import { equipmentName, Exercise_get } from "../models/exercise";
import type { IExercisePickerSelectedExercise, ISettings } from "../types";

export type ILiftographRailArgs = Omit<ILiftographCompletionArgs, "doc" | "host" | "explicit">;

type IBlock = ILiftographRowItem | ILiftographWidgetItem;

const NEW_SERIES = "name: New series / source: exercise(Squat)";
const FILTERS: Partial<Record<string, string[]>> = {
  workout: ["program", "day"],
  exercise: ["program", "label", "day"],
};
const RANGE_DEFAULTS: Partial<Record<string, string>> = { graph: "3m", muscles: "4w", calendar: "3m" };
const KEY_DEFAULTS: Partial<Record<string, string>> = {
  name: "Name",
  source: "exercise(Squat)",
  mark: "bars",
  axis: "right",
  color: LiftographPalette_names[0],
  compare: "4w",
  trend: "3m",
  show: "map",
};

function makePill(
  label: string,
  edit: ITextEdit,
  extra: Partial<ILiftoEditorPill> = {},
  category: ILiftoEditorPillCategory = "neutral"
): ILiftoEditorPill {
  return { kind: "liftograph", label, category, start: edit.start, end: edit.end, text: edit.text, ...extra };
}

function level(
  label: string,
  nodeName: string,
  span: ILiftographSpan,
  pills: ILiftoEditorPill[],
  removeEdits?: ITextEdit[]
): ILiftoEditorLevel {
  return { label, nodeName, start: span.from, end: span.to, pills, ownsRail: true, removeEdits };
}

function textOf(text: string, node: { from: number; to: number }): string {
  return text.slice(node.from, node.to);
}

function children(node: SyntaxNode): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (let child = node.firstChild; child != null; child = child.nextSibling) {
    result.push(child);
  }
  return result;
}

function ancestor(node: SyntaxNode | null, id: number): SyntaxNode | undefined {
  for (let n = node; n != null; n = n.parent) {
    if (n.type.id === id) {
      return n;
    }
  }
  return undefined;
}

function contains(span: ILiftographSpan, pos: number): boolean {
  return pos >= span.from && pos <= span.to;
}

function nodeAt(doc: ILiftographDocument, pos: number): SyntaxNode {
  const after = doc.tree.resolveInner(pos, 1);
  return after.type.id === T.Document || after.type.id === T.Line ? doc.tree.resolveInner(pos, -1) : after;
}

function fieldLineIn(doc: ILiftographDocument, span: ILiftographSpan): SyntaxNode | undefined {
  let found: SyntaxNode | undefined;
  doc.tree.iterate({
    from: span.from,
    to: span.to,
    enter: (node) => {
      if (found != null) {
        return false;
      }
      if (node.type.id === T.FieldLine && node.from >= span.from) {
        found = node.node;
        return false;
      }
      return undefined;
    },
  });
  return found;
}

function indentOf(doc: ILiftographDocument, span: ILiftographSpan): string {
  const first = fieldLineIn(doc, span);
  return doc.text.slice(span.from, first?.from ?? span.from);
}

function wholeLines(doc: ILiftographDocument, from: number, to: number): ITextEdit {
  const index = doc.lines.findIndex((line) => contains(line.span, to));
  const first = LiftographDocument_lineAt(doc, from);
  const start = first?.span.from ?? from;
  const next = index >= 0 ? doc.lines[index + 1] : undefined;
  if (next != null) {
    return { start, end: next.span.from, text: "" };
  }
  const previous = doc.lines[doc.lines.findIndex((line) => line.span.from === start) - 1];
  return { start: previous != null ? previous.span.to : start, end: doc.text.length, text: "" };
}

function insertChild(doc: ILiftographDocument, block: IBlock, body: string): { edit: ITextEdit; bodyAt: number } {
  const isClosed = ancestor(doc.tree.resolveInner(block.span.to, -1), T.CloseLine) != null;
  const closeLine = isClosed ? LiftographDocument_lineAt(doc, block.span.to) : undefined;
  if (closeLine != null) {
    const at = closeLine.span.from;
    return { edit: { start: at, end: at, text: `${body}\n` }, bodyAt: at };
  }
  const at = block.span.to;
  return { edit: { start: at, end: at, text: `\n${body}` }, bodyAt: at + 1 };
}

function fieldsOf(fieldLine: SyntaxNode): SyntaxNode[] {
  return children(fieldLine).filter((c) => c.type.id === T.Head || c.type.id === T.Field);
}

function keyOf(text: string, field: SyntaxNode): string | undefined {
  const key = field.getChild(T.Key);
  return key != null && field.getChild(T.Colon) != null ? textOf(text, key) : undefined;
}

function sourceType(text: string, fieldLine: SyntaxNode): "exercise" | "workout" | "stats" | undefined {
  const source = fieldsOf(fieldLine).find((f) => keyOf(text, f) === "source");
  const value = source?.getChild(T.Value)?.firstChild;
  const name = value?.type.id === T.Call ? value.getChild(T.Identifier) : value?.firstChild;
  const word = name != null ? textOf(text, name) : undefined;
  return word === "workout" || word === "stats" ? word : word != null ? "exercise" : undefined;
}

function scriptOf(text: string, fieldLine: SyntaxNode): string | undefined {
  const body = fieldLine.getChild(T.Script)?.getChild(T.ScriptBody);
  return body != null ? textOf(text, body) : undefined;
}

function isNumericX(doc: ILiftographDocument, fieldLine: SyntaxNode, args: ILiftographRailArgs): boolean {
  const script = scriptOf(doc.text, fieldLine);
  return script != null && LiftographScriptSyntax_pointArity(args.scriptTrees(script), script).has(2);
}

function takesNoArgs(
  doc: ILiftographDocument,
  key: string,
  name: string,
  fieldLine: SyntaxNode,
  args: ILiftographRailArgs
): boolean {
  if (key === "y") {
    return LiftographPresets_isName(name) && !liftographPresets[name].hasArg;
  }
  return key === "group" && isNumericX(doc, fieldLine, args);
}

function keyDefault(
  doc: ILiftographDocument,
  key: string,
  kind: string,
  fieldLine: SyntaxNode,
  args: ILiftographRailArgs
): string | undefined {
  const script = scriptOf(doc.text, fieldLine);
  if (key === "range") {
    return RANGE_DEFAULTS[kind];
  } else if (key === "group") {
    return isNumericX(doc, fieldLine, args) ? "max" : "sum(1w)";
  } else if (key === "smooth") {
    return isNumericX(doc, fieldLine, args) ? "avg(5)" : "avg(4w)";
  } else if (key === "source" && kind === "muscles") {
    return "workout";
  } else if (key === "y") {
    const type = sourceType(doc.text, fieldLine);
    const preset = Object.values(liftographPresets).find(
      (p) => !p.hasArg && (type == null || p.sources.indexOf(type) !== -1)
    );
    return script == null ? preset?.name : undefined;
  }
  return KEY_DEFAULTS[key];
}

function addKeyPills(
  doc: ILiftographDocument,
  fieldLine: SyntaxNode,
  owner: "series" | "graph" | "value" | "muscles" | "calendar",
  kind: string,
  args: ILiftographRailArgs
): ILiftoEditorPill[] {
  const fields = fieldsOf(fieldLine);
  const present = fields.map((f) => keyOf(doc.text, f));
  const at = fields[fields.length - 1]?.to ?? fieldLine.to;
  return LiftographCompile_keys[owner].flatMap((key) => {
    const value = present.indexOf(key) === -1 ? keyDefault(doc, key, kind, fieldLine, args) : undefined;
    if (value == null) {
      return [];
    }
    const insert = ` / ${key}: ${value}`;
    return [
      makePill(`Add ${key}`, { start: at, end: at, text: insert }, { focusAt: at + insert.length - value.length }),
    ];
  });
}

function addScriptPill(doc: ILiftographDocument, fieldLine: SyntaxNode): ILiftoEditorPill[] {
  const fields = fieldsOf(fieldLine);
  const hasY = fields.some((f) => keyOf(doc.text, f) === "y");
  if (fieldLine.getChild(T.Script) != null || fieldLine.getChild(T.BlockOpen) != null || hasY) {
    return [];
  }
  const at = fields[fields.length - 1]?.to ?? fieldLine.to;
  return [makePill("Add script", { start: at, end: at, text: " {~  ~}" }, { freeformAt: at + 4 })];
}

function optionPills(
  doc: ILiftographDocument,
  pos: number,
  args: ILiftographRailArgs
): { pills: ILiftoEditorPill[]; from: number; to: number } | undefined {
  const candidates = LiftographCompletions_candidates(pos, { ...args, doc, host: "popup", explicit: true });
  if (candidates == null) {
    return undefined;
  }
  return {
    from: candidates.from,
    to: candidates.to,
    pills: candidates.options.map((option: ILiftographCompletionOption) => {
      const insert = option.insert ?? option.label;
      const caret = option.caret ?? insert.length;
      const edit = { start: candidates.from, end: candidates.to, text: insert };
      const place = caret < insert.length ? { freeformAt: candidates.from + caret } : { focusAt: candidates.from };
      return makePill(option.display ?? option.label, edit, place, "logic");
    }),
  };
}

function sourcePills(value: SyntaxNode | null, colon: SyntaxNode, kind: string): ILiftoEditorPill[] {
  const span = value != null ? { start: value.from, end: value.to } : { start: colon.to, end: colon.to };
  const lead = value != null ? "" : " ";
  const workout = makePill(
    "workout",
    { ...span, text: `${lead}workout` },
    { focusAt: span.start + lead.length },
    "logic"
  );
  if (kind === "muscles") {
    return [workout];
  }
  return [
    makePill(
      "exercise",
      { ...span, text: `${lead}exercise(Squat)` },
      { focusAt: span.start + lead.length + 9 },
      "logic"
    ),
    workout,
    makePill("stats", { ...span, text: `${lead}stats(weight)` }, { focusAt: span.start + lead.length + 6 }, "logic"),
  ];
}

function fieldLevel(
  doc: ILiftographDocument,
  field: SyntaxNode,
  fieldLine: SyntaxNode,
  kind: string,
  args: ILiftographRailArgs
): ILiftoEditorLevel | undefined {
  const text = doc.text;
  const key = keyOf(text, field);
  const colon = field.getChild(T.Colon);
  if (key == null || colon == null) {
    return undefined;
  }
  const value = field.getChild(T.Value);
  let pills: ILiftoEditorPill[];
  if (key === "name") {
    const span = value != null ? { start: value.from, end: value.to } : { start: colon.to, end: colon.to };
    pills = [makePill("Rename", { ...span, text: value != null ? textOf(text, value) : "" }, { action: "rename" })];
  } else if (key === "source") {
    pills = sourcePills(value, colon, kind);
  } else {
    const call = value?.firstChild?.type.id === T.Call ? value.firstChild : undefined;
    const pos = call != null ? (call.getChild(T.Identifier)?.to ?? value?.to) : (value?.to ?? colon.to);
    const options = pos != null ? (optionPills(doc, pos, args)?.pills ?? []) : [];
    pills =
      call != null
        ? options.map((p) => (takesNoArgs(doc, key, p.text, fieldLine, args) ? { ...p, end: call.to } : p))
        : options;
  }
  return level(key, `field:${key}`, field, pills, [fieldRemoval(fieldLine, field)]);
}

function fieldRemoval(fieldLine: SyntaxNode, field: SyntaxNode): ITextEdit {
  const parts = children(fieldLine);
  const index = parts.findIndex((p) => p.from === field.from);
  const previous = index > 1 ? parts[index - 2] : undefined;
  if (previous != null && parts[index - 1]?.type.id === T.Sep) {
    return { start: previous.to, end: field.to, text: "" };
  }
  const next = parts.slice(index + 1).find((p) => p.type.id === T.Field);
  return { start: field.from, end: next?.from ?? field.to, text: "" };
}

function argRemoval(call: SyntaxNode, arg: SyntaxNode): ITextEdit {
  const parts = children(call);
  const index = parts.findIndex((p) => p.from === arg.from && p.type.id === T.Arg);
  if (parts[index - 1]?.type.id === T.Comma && parts[index - 2] != null) {
    return { start: parts[index - 2].to, end: arg.to, text: "" };
  }
  const nextArg = parts.slice(index + 1).find((p) => p.type.id === T.Arg);
  return { start: arg.from, end: nextArg?.from ?? arg.to, text: "" };
}

function positionalArgs(call: SyntaxNode): SyntaxNode[] {
  return call.getChildren(T.Arg).filter((a) => a.getChild(T.NamedArg) == null);
}

function exercisePills(doc: ILiftographDocument, call: SyntaxNode, args: ILiftographRailArgs): ILiftoEditorPill[] {
  const text = doc.text;
  const positional = positionalArgs(call);
  const [first] = positional;
  const close = call.getChild(T.CloseParen);
  const open = call.getChild(T.OpenParen);
  const nameSpan = {
    start: first?.from ?? open?.to ?? call.to,
    end: first?.to ?? open?.to ?? call.to,
  };
  const result: ILiftoEditorPill[] = [
    makePill(
      "Change exercise",
      { ...nameSpan, text: textOf(text, { from: nameSpan.start, to: nameSpan.end }) },
      {
        action: "changeExercise",
        extraEdits: positional.slice(1).map((arg) => argRemoval(call, arg)),
      }
    ),
  ];
  const present = call.getChildren(T.Arg).flatMap((a) => {
    const key = a.getChild(T.NamedArg)?.getChild(T.Key);
    return key != null ? [textOf(text, key)] : [];
  });
  const at = close?.from ?? call.to;
  for (const filter of (FILTERS.exercise ?? []).filter((f) => present.indexOf(f) === -1)) {
    const insert = `${first != null ? ", " : ""}${filter}: `;
    result.push(makePill(`Add ${filter}`, { start: at, end: at, text: insert }, { freeformAt: at + insert.length }));
  }
  return result;
}

function argContent(text: string, arg: SyntaxNode): string {
  const value = arg.getChild(T.ArgValue)?.firstChild;
  if (value?.type.id === T.Quoted) {
    return value
      .getChildren(T.QuoteText)
      .map((piece) => textOf(text, piece))
      .join("");
  }
  return value != null ? textOf(text, value) : "";
}

function argumentLevel(
  doc: ILiftographDocument,
  call: SyntaxNode,
  arg: SyntaxNode,
  key: string,
  args: ILiftographRailArgs
): ILiftoEditorLevel {
  const text = doc.text;
  const fn = textOf(text, call.getChild(T.Identifier) ?? { from: call.from, to: call.from });
  const isExerciseName = key === "source" && fn === "exercise" && positionalArgs(call).some((a) => a.from === arg.from);
  const named = arg.getChild(T.NamedArg)?.getChild(T.Key);
  let pills: ILiftoEditorPill[];
  if (isExerciseName) {
    pills = exercisePills(doc, call, args);
  } else if (key === "source" && fn === "workout") {
    const close = call.getChild(T.CloseParen)?.from ?? call.to;
    const present = call.getChildren(T.Arg).flatMap((a) => {
      const k = a.getChild(T.NamedArg)?.getChild(T.Key);
      return k != null ? [textOf(text, k)] : [];
    });
    pills = (FILTERS.workout ?? [])
      .filter((f) => present.indexOf(f) === -1)
      .map((f) => {
        const insert = `, ${f}: `;
        return makePill(`Add ${f}`, { start: close, end: close, text: insert }, { freeformAt: close + insert.length });
      });
  } else {
    pills = named != null ? [] : (optionPills(doc, arg.to, args)?.pills ?? []);
  }
  const label = named != null ? textOf(text, named) : argContent(text, arg) || fn;
  return level(label, `argument:${fn}`, arg, pills, [argRemoval(call, arg)]);
}

function blockAt(
  doc: ILiftographDocument,
  pos: number
): { row?: ILiftographRowItem; item?: ILiftographWidgetItem | ILiftographTextItem } {
  for (const item of doc.items) {
    if (
      item.type === "row" &&
      (contains(item.span, pos) || (item.caption != null && contains(item.caption.span, pos)))
    ) {
      const inner = item.items.find(
        (i) => contains(i.span, pos) || (i.type === "widget" && i.caption != null && contains(i.caption.span, pos))
      );
      return { row: item, item: inner };
    } else if (
      item.type !== "row" &&
      (contains(item.span, pos) || (item.type === "widget" && item.caption != null && contains(item.caption.span, pos)))
    ) {
      return { item };
    }
  }
  return {};
}

function rowLevel(doc: ILiftographDocument, row: ILiftographRowItem): ILiftoEditorLevel {
  const indent = `${indentOf(doc, row.span)}  `;
  const add = (kind: string, line: string): ILiftoEditorPill => {
    const { edit, bodyAt } = insertChild(doc, row, `${indent}${line}`);
    return makePill(`Add ${kind}`, edit, { focusAt: bodyAt + indent.length });
  };
  return level(
    "row",
    "row",
    row.span,
    [
      add("graph", `graph {\n${indent}  ${NEW_SERIES}\n${indent}}`),
      add("value", `value / ${NEW_SERIES.replace("name: New series / ", "")}`),
    ],
    [wholeLines(doc, row.caption?.span.from ?? row.span.from, row.span.to)]
  );
}

function widgetLevel(
  doc: ILiftographDocument,
  widget: ILiftographWidgetItem,
  args: ILiftographRailArgs
): ILiftoEditorLevel {
  const fieldLine = fieldLineIn(doc, widget.span);
  const owner =
    widget.kind === "graph" || widget.kind === "value" || widget.kind === "muscles" || widget.kind === "calendar"
      ? widget.kind
      : undefined;
  const pills: ILiftoEditorPill[] = [];
  if (widget.kind === "graph" && widget.hasBlock) {
    const body = `${indentOf(doc, widget.span)}  ${NEW_SERIES}`;
    const { edit, bodyAt } = insertChild(doc, widget, body);
    pills.push(makePill("Add series", edit, { focusAt: bodyAt + body.indexOf("Squat") }));
  }
  if (fieldLine != null && owner != null) {
    pills.push(...addKeyPills(doc, fieldLine, owner, widget.kind, args));
    if (widget.kind === "value") {
      pills.push(...addScriptPill(doc, fieldLine));
    }
  }
  const removeFrom = widget.caption?.span.from ?? widget.span.from;
  return level(widget.kind, `widget:${widget.kind}`, widget.span, pills, [wholeLines(doc, removeFrom, widget.span.to)]);
}

function seriesLevel(
  doc: ILiftographDocument,
  series: ILiftographSeriesNode,
  args: ILiftographRailArgs
): ILiftoEditorLevel {
  const fieldLine = fieldLineIn(doc, series.span);
  const name = series.pairs.find((pair) => pair.key === "name")?.value;
  const label = name == null ? "series" : name.type === "quoted" ? name.content : textOf(doc.text, name.span);
  const pills =
    fieldLine != null
      ? [...addKeyPills(doc, fieldLine, "series", "series", args), ...addScriptPill(doc, fieldLine)]
      : [];
  return level(label, "series", series.span, pills, [wholeLines(doc, series.span.from, series.span.to)]);
}

function innerLevels(
  doc: ILiftographDocument,
  pos: number,
  fieldLine: SyntaxNode,
  kind: string,
  args: ILiftographRailArgs
): ILiftoEditorLevel[] {
  const node = nodeAt(doc, pos);
  const script = ancestor(node, T.Script);
  if (script != null) {
    const parts = children(fieldLine);
    const previous = parts[parts.findIndex((p) => p.from === script.from) - 1];
    const bodyFrom = script.getChild(T.ScriptOpen)?.to ?? script.from;
    return [
      level(
        "script",
        "script",
        script,
        [makePill("Edit script", { start: bodyFrom, end: bodyFrom, text: "" }, { freeformAt: bodyFrom + 1 })],
        [{ start: previous?.to ?? script.from, end: script.to, text: "" }]
      ),
    ];
  }
  const field = ancestor(node, T.Field) ?? ancestor(node, T.Head);
  if (field == null) {
    return [];
  }
  const fieldResult = fieldLevel(doc, field, fieldLine, kind, args);
  if (fieldResult == null) {
    return [];
  }
  const call = ancestor(node, T.Call);
  const arg = ancestor(node, T.Arg);
  const key = keyOf(doc.text, field) ?? "";
  return call != null && arg != null ? [fieldResult, argumentLevel(doc, call, arg, key, args)] : [fieldResult];
}

function topLevel(doc: ILiftographDocument, pos: number, args: ILiftographRailArgs): ILiftoEditorLevel {
  const line = LiftographDocument_lineAt(doc, pos);
  const span = line?.span ?? { from: pos, to: pos };
  const atLine = span.to;
  const pills = optionPills(doc, atLine, args)?.pills ?? [];
  return level("dashboard", "top", span, pills);
}

export function LiftographRail_context(
  doc: ILiftographDocument,
  pos: number,
  args: ILiftographRailArgs
): ILiftoEditorContext {
  const line = LiftographDocument_lineAt(doc, pos);
  if (line != null && doc.hiddenSpans.some((span) => contains(span, pos))) {
    return { breadcrumb: [], levels: [] };
  }
  const { row, item } = blockAt(doc, pos);
  const levels: ILiftoEditorLevel[] = [];
  if (row != null) {
    levels.push(rowLevel(doc, row));
  }
  const caption =
    item?.type === "text"
      ? item
      : item?.type === "widget" && item.caption != null && contains(item.caption.span, pos)
        ? item.caption
        : row?.caption != null && contains(row.caption.span, pos)
          ? row.caption
          : undefined;
  if (caption != null) {
    levels.push(
      level(
        "text",
        "caption",
        caption.span,
        [
          makePill(
            "Edit text",
            { start: caption.span.to, end: caption.span.to, text: "" },
            { freeformAt: caption.span.to }
          ),
        ],
        [wholeLines(doc, caption.span.from, caption.span.to)]
      )
    );
  } else if (item?.type === "widget") {
    levels.push(widgetLevel(doc, item, args));
    const series = item.series.find((s) => contains(s.span, pos));
    const lineSpan = series?.span ?? (line != null && line.owner !== "graph" ? line.span : undefined);
    if (series != null) {
      levels.push(seriesLevel(doc, series, args));
    }
    const fieldLine = lineSpan != null ? fieldLineIn(doc, lineSpan) : undefined;
    if (fieldLine != null && contains(fieldLine, pos)) {
      levels.push(...innerLevels(doc, pos, fieldLine, item.kind, args));
    }
  } else if (row == null) {
    levels.push(topLevel(doc, pos, args));
  }
  return { breadcrumb: levels.map((l) => l.label), levels };
}

export function LiftographRail_pickedExercise(
  selected: IExercisePickerSelectedExercise,
  settings: ISettings
): { name: string; equipment: string | undefined } | undefined {
  if (selected.type === "template") {
    return undefined;
  }
  const exercise = Exercise_get(selected.exerciseType, settings.exercises);
  const equipment = selected.exerciseType.equipment;
  return { name: exercise.name, equipment: equipment != null ? equipmentName(equipment) : undefined };
}

export function LiftographRail_exerciseEdit(
  pill: ILiftoEditorPill,
  name: string,
  equipment: string | undefined
): ITextEdit {
  const names = [LiftographWrite_quote(name), ...(equipment != null ? [LiftographWrite_quote(equipment)] : [])];
  return { start: pill.start, end: pill.end, text: names.join(", ") };
}

export function LiftographRail_renameEdit(pill: ILiftoEditorPill, value: string): ITextEdit {
  return {
    start: pill.start,
    end: pill.end,
    text: `${pill.start === pill.end ? " " : ""}${LiftographWrite_quote(value)}`,
  };
}
