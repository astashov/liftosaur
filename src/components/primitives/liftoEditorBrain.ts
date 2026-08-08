import { SyntaxNode } from "@lezer/common";
import { parser } from "../../pages/planner/plannerExerciseParser";
import { parser as liftoscriptParser } from "../../liftoscript";
import { PlannerNodeName } from "../../pages/planner/plannerExerciseStyles";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import {
  ILiftoEditorPill,
  LiftoEditorActions_endOfExerciseLine,
  LiftoEditorActions_enclosingExercise,
  LiftoEditorActions_labelRenamePill,
  LiftoEditorActions_pillsForNode,
  LiftoEditorActions_setVariationSections,
} from "./liftoEditorActions";

function nodeText(text: string, node: SyntaxNode): string {
  return text.slice(node.from, node.to);
}

export interface ITextEdit {
  start: number;
  end: number;
  text: string;
}

export interface ILiftoEditorStyledRange {
  start: number;
  end: number;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
}

interface INodeStyle {
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

// Mirrors plannerExerciseStyles.ts tag assignments and plannerEditor.ts tag->semantic-color
// mapping, collapsed into node->color since there's no CodeMirror HighlightStyle here.
function nodeStyles(): Partial<Record<PlannerNodeName, INodeStyle>> {
  const syntax = Tailwind_semantic().syntax;
  return {
    [PlannerNodeName.SetPart]: { color: syntax.atom },
    [PlannerNodeName.WarmupSetPart]: { color: syntax.atom },
    [PlannerNodeName.Rpe]: { color: syntax.literal },
    [PlannerNodeName.Timer]: { color: syntax.keyword },
    [PlannerNodeName.SetTimer]: { color: syntax.keyword },
    [PlannerNodeName.Auto]: { color: syntax.keyword },
    [PlannerNodeName.Weight]: { color: syntax.literal },
    [PlannerNodeName.Percentage]: { color: syntax.literal },
    [PlannerNodeName.AskWeight]: { color: syntax.literal },
    [PlannerNodeName.LineComment]: { color: syntax.comment },
    [PlannerNodeName.TripleLineComment]: { color: syntax.blockComment },
    [PlannerNodeName.SupersetKeyword]: { color: syntax.keyword },
    [PlannerNodeName.SectionSeparator]: { color: syntax.comment },
    [PlannerNodeName.ExercisePropertyName]: { color: syntax.keyword },
    [PlannerNodeName.FunctionName]: { color: syntax.attributeName },
    [PlannerNodeName.FunctionArgument]: { color: syntax.attributeValue },
    [PlannerNodeName.None]: { color: syntax.atom },
    [PlannerNodeName.Week]: { color: syntax.annotation, bold: true },
    [PlannerNodeName.Day]: { color: syntax.docComment, bold: true },
    [PlannerNodeName.WeekDay]: { color: syntax.atom },
    [PlannerNodeName.Repeat]: { color: syntax.atom },
  };
}

// Mirrors liftoscriptLanguage.ts styleTags resolved through plannerEditor.ts's HighlightStyle
// (Number is a subtag of literal, Unit of keyword), except StateVariable is styled as a whole —
// web's nested Keyword rule splits "state.foo" into differently-colored pieces, which looks
// accidental rather than intentional.
function liftoscriptNodeStyles(): Partial<Record<string, INodeStyle>> {
  const syntax = Tailwind_semantic().syntax;
  return {
    StateVariable: { color: syntax.variable },
    Keyword: { color: syntax.keyword },
    Unit: { color: syntax.keyword },
    Number: { color: syntax.literal },
    LineComment: { color: syntax.comment },
  };
}

// The Liftoscript planner token includes the {~ ~} delimiters; the liftoscript grammar
// @skips them, so parsing the raw slice works and the delimiters stay unstyled.
function pushLiftoscriptRanges(text: string, from: number, to: number, ranges: ILiftoEditorStyledRange[]): void {
  const styles = liftoscriptNodeStyles();
  const tree = liftoscriptParser.parse(text.slice(from, to));
  tree.iterate({
    enter: (node) => {
      const style = styles[node.name];
      if (style != null && node.to > node.from) {
        ranges.push({ start: from + node.from, end: from + node.to, ...style });
        return false;
      }
      return true;
    },
  });
}

export function LiftoEditorBrain_computeStyledRanges(text: string): ILiftoEditorStyledRange[] {
  const styles = nodeStyles();
  const ranges: ILiftoEditorStyledRange[] = [];
  const tree = parser.parse(text);
  tree.iterate({
    enter: (node) => {
      if (node.name === PlannerNodeName.Liftoscript) {
        pushLiftoscriptRanges(text, node.from, node.to, ranges);
        return false;
      }
      const style = styles[node.name as PlannerNodeName];
      if (style != null && node.to > node.from) {
        ranges.push({ start: node.from, end: node.to, ...style });
        return false;
      }
      return true;
    },
  });
  return ranges;
}

export interface IEditorTokenNumeric {
  kind: "weight" | "percentage" | "timer" | "number";
  // Weights in function args (lp/dp/sum increments) step by a plain unit; weights in set
  // sections (incl. globals and warmups) are real lifted weights, so the controller steps
  // them through Weight_increment/decrement to respect equipment settings.
  inFunctionArgs: boolean;
}

export interface IEditorToken {
  start: number;
  end: number;
  text: string;
  // ‹ › stops on it. False only for numeric tap-targets nested inside a larger stop (the
  // timers inside a `30s|60s` SetTimer, ints inside a ReuseSection) — tapping them opens
  // the keypad, but the walk treats the enclosing token as one stop.
  walkStop: boolean;
  // Present iff tapping the token opens the numeric keypad.
  numeric?: IEditorTokenNumeric;
}

// "Whole" = the node's entire text (digits + suffix, e.g. "100kg", "45%", "60s") is one
// steppable token — as opposed to bare Int/Float leaves, which become "number" tokens.
const wholeNumericTokenKinds: Partial<Record<PlannerNodeName, IEditorTokenNumeric["kind"]>> = {
  [PlannerNodeName.Weight]: "weight",
  [PlannerNodeName.Percentage]: "percentage",
  [PlannerNodeName.Timer]: "timer",
};

// Numeric spans inside a {~ ~} script body, found by nest-parsing like the highlighting
// does. They all count as "function args" for stepping: script weights are increments
// (weights += 5lb), not lifted loads, so they step by a plain unit.
function liftoscriptNumericSpans(
  text: string,
  from: number,
  to: number
): { start: number; end: number; kind: IEditorTokenNumeric["kind"] }[] {
  const spans: { start: number; end: number; kind: IEditorTokenNumeric["kind"] }[] = [];
  const tree = liftoscriptParser.parse(text.slice(from, to));
  tree.iterate({
    enter: (node) => {
      const kind =
        node.name === "WeightExpression"
          ? ("weight" as const)
          : node.name === "Percentage"
            ? ("percentage" as const)
            : node.name === "NumberExpression"
              ? ("number" as const)
              : undefined;
      if (kind != null && node.to > node.from) {
        spans.push({ start: from + node.from, end: from + node.to, kind });
        return false;
      }
      return true;
    },
  });
  return spans;
}

function isInFunctionArgs(node: SyntaxNode): boolean {
  for (let cur: SyntaxNode | null = node.parent; cur != null; cur = cur.parent) {
    if (cur.name === PlannerNodeName.FunctionExpression) {
      return true;
    }
  }
  return false;
}

// Set-section weights never reach this table — the controller steps them through
// Weight_increment/decrement so equipment settings (plates, fixed weights) apply.
// The weight entry here only serves function-argument weights like lp() increments.
const stepByKind: Record<IEditorTokenNumeric["kind"], (suffix: string) => number> = {
  weight: () => 1,
  percentage: () => 1,
  timer: () => 15,
  number: () => 1,
};

export function LiftoEditorBrain_stepToken(token: IEditorToken, direction: 1 | -1): string | undefined {
  if (token.numeric == null) {
    return undefined;
  }
  const match = token.text.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (match == null) {
    return undefined;
  }
  const [, sign, num, suffix] = match;
  const value = parseFloat(`${sign}${num}`);
  const step = stepByKind[token.numeric.kind](suffix);
  const next = Math.round((value + step * direction) * 100) / 100;
  return `${next}${suffix}`;
}

export interface ILiftoEditorHandle {
  setSelection: (start: number, end: number) => void;
  replaceRange: (start: number, end: number, text: string) => void;
  getText: () => string;
}

const breadcrumbLabels: Partial<Record<PlannerNodeName, string>> = {
  [PlannerNodeName.SetPart]: "Sets×Reps",
  [PlannerNodeName.Weight]: "Weight",
  [PlannerNodeName.WeightWithPlus]: "Weight",
  [PlannerNodeName.Percentage]: "Percentage",
  [PlannerNodeName.PercentageWithPlus]: "Percentage",
  [PlannerNodeName.Rpe]: "RPE",
  [PlannerNodeName.Timer]: "Rest timer",
  [PlannerNodeName.SetTimer]: "Set timer",
  [PlannerNodeName.Auto]: "Auto",
  [PlannerNodeName.WarmupExerciseSets]: "Warmup sets",
  [PlannerNodeName.WarmupSetPart]: "Sets×Reps",
  [PlannerNodeName.Repeat]: "Repeat",
  [PlannerNodeName.WeekDay]: "Week/Day",
  [PlannerNodeName.Superset]: "Superset",
  [PlannerNodeName.ReuseSection]: "Reuse",
  [PlannerNodeName.SetLabel]: "Set label",
  [PlannerNodeName.Week]: "Week",
  [PlannerNodeName.Day]: "Day",
};

export interface ILiftoEditorLevel {
  label: string;
  nodeName: string;
  start: number;
  end: number;
  pills: ILiftoEditorPill[];
}

export interface ILiftoEditorContext {
  // Outer -> inner; breadcrumb is levels' labels. Each level carries its node's extent for
  // level highlighting, its node name for sibling walking, and the add-actions valid there.
  breadcrumb: string[];
  levels: ILiftoEditorLevel[];
}

// Flattens possibly-overlapping styled ranges into sorted non-overlapping segments with
// merged properties (later ranges win per property). The native sides assume exactly this.
export function LiftoEditorBrain_flattenRanges(ranges: ILiftoEditorStyledRange[]): ILiftoEditorStyledRange[] {
  const boundaries = Array.from(new Set(ranges.flatMap((r) => [r.start, r.end]))).sort((a, b) => a - b);
  const result: ILiftoEditorStyledRange[] = [];
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const covering = ranges.filter((r) => r.start <= start && r.end >= end);
    if (covering.length === 0) {
      continue;
    }
    const merged = covering.reduce<ILiftoEditorStyledRange>((acc, r) => ({ ...acc, ...r, start, end }), {
      start,
      end,
    });
    result.push(merged);
  }
  return result;
}

// A set group whose Sets×Reps is removed stops reading as a set group ("warmup: 40%", or a
// weight that now looks like globals), so removal must target the whole group. Warmup
// groups aren't breadcrumb levels, so the extent is re-derived from the tree; isOnlyGroup
// lets the caller cascade further when the group list would end up empty.
export function LiftoEditorBrain_enclosingSetGroup(
  text: string,
  level: { nodeName: string; start: number }
): { nodeName: string; start: number; end: number; isOnlyGroup: boolean } | undefined {
  const groupName =
    level.nodeName === PlannerNodeName.SetPart
      ? PlannerNodeName.ExerciseSet
      : level.nodeName === PlannerNodeName.WarmupSetPart
        ? PlannerNodeName.WarmupExerciseSet
        : undefined;
  if (groupName == null) {
    return undefined;
  }
  let node: SyntaxNode | null = parser.parse(text).resolveInner(level.start + 1, -1);
  while (node != null && node.name !== groupName) {
    node = node.parent;
  }
  if (node == null) {
    return undefined;
  }
  const siblings = node.parent?.getChildren(groupName) ?? [];
  return { nodeName: node.name, start: node.from, end: node.to, isOnlyGroup: siblings.length <= 1 };
}

export function LiftoEditorBrain_contextAt(text: string, index: number): ILiftoEditorContext {
  const tree = parser.parse(text);
  const inner = tree.resolveInner(index, -1);
  const levels: ILiftoEditorLevel[] = [];
  for (let node: SyntaxNode | null = inner; node != null; node = node.parent) {
    const name = node.name as PlannerNodeName;
    if (name === PlannerNodeName.ExerciseSet) {
      const isGlobals = node.getChild(PlannerNodeName.SetPart) == null;
      const siblings = node.parent?.getChildren(PlannerNodeName.ExerciseSet) ?? [];
      const setIndex = siblings.findIndex((s) => s.from === node!.from);
      levels.unshift({
        label: isGlobals ? "Globals" : `Set group${siblings.length > 1 ? ` ${setIndex + 1}` : ""}`,
        nodeName: name,
        start: node.from,
        end: node.to,
        pills: LiftoEditorActions_pillsForNode(text, node),
      });
    } else if (name === PlannerNodeName.ExerciseSets) {
      const exercise = LiftoEditorActions_enclosingExercise(node);
      const variations = exercise != null ? LiftoEditorActions_setVariationSections(exercise) : [];
      const variationIndex = variations.findIndex((s) => s.from === node!.from);
      levels.unshift({
        label: variations.length > 1 && variationIndex !== -1 ? `Sets ${variationIndex + 1}` : "Sets",
        nodeName: name,
        start: node.from,
        end: node.to,
        pills: LiftoEditorActions_pillsForNode(text, node),
      });
    } else if (name === PlannerNodeName.ExerciseVariation) {
      const siblings = node.parent?.getChildren(PlannerNodeName.ExerciseVariation) ?? [];
      // Single-variation exercises (the common case) get no level: the exercise level
      // already covers the name, and "Variation 1" would just be noise.
      if (siblings.length > 1) {
        const variationIndex = siblings.findIndex((s) => s.from === node!.from);
        levels.unshift({
          label: `Variation ${variationIndex + 1}`,
          nodeName: name,
          start: node.from,
          end: node.to,
          pills: LiftoEditorActions_pillsForNode(text, node),
        });
      }
    } else if (name === PlannerNodeName.ExerciseExpression) {
      const exerciseName = node
        .getChild(PlannerNodeName.ExerciseVariations)
        ?.getChild(PlannerNodeName.ExerciseVariation)
        ?.getChild(PlannerNodeName.ExerciseName);
      levels.unshift({
        label: exerciseName != null ? nodeText(text, exerciseName).trim() : "Exercise",
        nodeName: name,
        start: node.from,
        end: LiftoEditorActions_endOfExerciseLine(text, node),
        pills: LiftoEditorActions_pillsForNode(text, node),
      });
    } else if (name === PlannerNodeName.KeyValue) {
      const keyword = node.getChild(PlannerNodeName.Keyword);
      if (keyword != null) {
        levels.unshift({
          label: nodeText(text, keyword),
          nodeName: name,
          start: node.from,
          end: node.to,
          pills: LiftoEditorActions_pillsForNode(text, node),
        });
      }
    } else if (name === PlannerNodeName.ExerciseName && node.parent?.name === PlannerNodeName.ExerciseVariation) {
      // The grammar lumps `label: Name` into one ExerciseName token (":" is a name char),
      // so the Label level is synthesized: it exists only when the tap lands inside the
      // label part. Level extent includes ": " so ✕-removal eats the whole prefix; the
      // rename pill targets just the label word.
      const nameText = nodeText(text, node);
      const colonIdx = nameText.indexOf(":");
      if (colonIdx !== -1 && index <= node.from + colonIdx) {
        const labelEnd = node.from + colonIdx;
        let afterColon = labelEnd + 1;
        while (text[afterColon] === " ") {
          afterColon += 1;
        }
        const renamePill = LiftoEditorActions_labelRenamePill(text, node);
        levels.unshift({
          label: "Label",
          nodeName: name,
          start: node.from,
          end: afterColon,
          pills: renamePill != null ? [renamePill] : [],
        });
      }
    } else if (name === PlannerNodeName.ExerciseProperty) {
      const propertyName = node.getChild(PlannerNodeName.ExercisePropertyName);
      if (propertyName != null) {
        const label = nodeText(text, propertyName);
        levels.unshift({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          nodeName: name,
          start: node.from,
          end: node.to,
          pills: LiftoEditorActions_pillsForNode(text, node),
        });
      }
    } else if (name === PlannerNodeName.FunctionExpression) {
      const functionName = node.getChild(PlannerNodeName.FunctionName);
      if (functionName != null) {
        levels.unshift({
          label: `${nodeText(text, functionName)}()`,
          nodeName: name,
          start: node.from,
          end: node.to,
          pills: LiftoEditorActions_pillsForNode(text, node),
        });
      }
    } else {
      const label = breadcrumbLabels[name];
      if (label != null && levels[0]?.label !== label) {
        // Week/Day tokens include their trailing linebreak; keep the highlight on the line.
        const end =
          name === PlannerNodeName.Week || name === PlannerNodeName.Day
            ? LiftoEditorActions_endOfExerciseLine(text, node)
            : node.to;
        levels.unshift({
          label,
          nodeName: name,
          start: node.from,
          end,
          pills: LiftoEditorActions_pillsForNode(text, node),
        });
      }
    }
  }
  return { breadcrumb: levels.map((level) => level.label), levels };
}

// Non-numeric word-level stops. A tap or ‹ › lands on the whole token; unlike numeric
// tokens they open no keypad. The walk descends INTO them looking for nested numeric
// tap-targets (a SetTimer's inner timers, a ReuseSection's week/day ints) — those come out
// with walkStop: false so the enclosing token stays a single ‹ › stop.
const plainFocusNames = new Set<string>([
  PlannerNodeName.ExerciseName,
  PlannerNodeName.ExercisePropertyName,
  PlannerNodeName.FunctionName,
  PlannerNodeName.SetTimer,
  PlannerNodeName.None,
  PlannerNodeName.Auto,
  PlannerNodeName.AskWeight,
  PlannerNodeName.Liftoscript,
  PlannerNodeName.ReuseSection,
  PlannerNodeName.SetLabel,
]);

// The single walk behind both ‹ › focus hopping (walkStop tokens) and keypad targeting
// (numeric tokens). Whole numeric terminals (Weight/Percentage/Timer) are checked before
// plain names because their digits are not separate Int nodes.
export function LiftoEditorBrain_tokens(text: string): IEditorToken[] {
  const tree = parser.parse(text);
  const tokens: IEditorToken[] = [];
  const plainStopStack: { from: number; to: number }[] = [];
  const plainSpan = (start: number, end: number): IEditorToken => {
    return { start, end, text: text.slice(start, end), walkStop: true };
  };
  tree.iterate({
    enter: (node) => {
      if (node.to <= node.from) {
        return true;
      }
      const insidePlainStop = plainStopStack.length > 0;
      if (node.name === PlannerNodeName.Liftoscript) {
        for (const span of liftoscriptNumericSpans(text, node.from, node.to)) {
          tokens.push({
            start: span.start,
            end: span.end,
            text: text.slice(span.start, span.end),
            walkStop: true,
            numeric: { kind: span.kind, inFunctionArgs: true },
          });
        }
        return false;
      }
      const whole = wholeNumericTokenKinds[node.name as PlannerNodeName];
      if (whole != null) {
        tokens.push({
          start: node.from,
          end: node.to,
          text: text.slice(node.from, node.to),
          walkStop: !insidePlainStop,
          numeric: { kind: whole, inFunctionArgs: isInFunctionArgs(node.node) },
        });
        return false;
      }
      if (node.name === PlannerNodeName.Int || node.name === PlannerNodeName.Float) {
        tokens.push({
          start: node.from,
          end: node.to,
          text: text.slice(node.from, node.to),
          walkStop: !insidePlainStop,
          numeric: { kind: "number", inFunctionArgs: isInFunctionArgs(node.node) },
        });
        return false;
      }
      if (insidePlainStop) {
        // The enclosing token already is the stop; keep descending for numeric tap-targets.
        return true;
      }
      // State var names in custom(): the raw Keyword token inside KeyValue, so tapping
      // `myvar` in `custom(myvar: 0)` focuses it (the value stays a numeric keypad stop).
      if (node.name === PlannerNodeName.Keyword && node.node.parent?.name === PlannerNodeName.KeyValue) {
        tokens.push(plainSpan(node.from, node.to));
        return false;
      }
      if (plainFocusNames.has(node.name)) {
        // `label: Name` is one ExerciseName token; split it so the label and the name are
        // separate focus stops (matching the synthesized Label breadcrumb level).
        if (
          node.name === PlannerNodeName.ExerciseName &&
          node.node.parent?.name === PlannerNodeName.ExerciseVariation
        ) {
          const colonIdx = text.slice(node.from, node.to).indexOf(":");
          if (colonIdx !== -1) {
            tokens.push(plainSpan(node.from, node.from + colonIdx));
            let rest = node.from + colonIdx + 1;
            while (text[rest] === " ") {
              rest += 1;
            }
            if (rest < node.to) {
              tokens.push(plainSpan(rest, node.to));
            }
            return false;
          }
        }
        // SetTimer is one terminal ("30s|60s"), so its two timers aren't Int children the
        // descent below could find — split them out here as keypad tap-targets.
        if (node.name === PlannerNodeName.SetTimer) {
          tokens.push(plainSpan(node.from, node.to));
          const raw = text.slice(node.from, node.to);
          const timerRe = /\d+s/g;
          let timerMatch: RegExpExecArray | null;
          while ((timerMatch = timerRe.exec(raw)) != null) {
            const start = node.from + timerMatch.index;
            tokens.push({
              start,
              end: start + timerMatch[0].length,
              text: timerMatch[0],
              walkStop: false,
              numeric: { kind: "timer", inFunctionArgs: false },
            });
          }
          return false;
        }
        tokens.push(plainSpan(node.from, node.to));
        plainStopStack.push({ from: node.from, to: node.to });
        return true;
      }
      return true;
    },
    leave: (node) => {
      const top = plainStopStack[plainStopStack.length - 1];
      if (top != null && top.from === node.from && top.to === node.to) {
        plainStopStack.pop();
      }
    },
  });
  return tokens;
}
