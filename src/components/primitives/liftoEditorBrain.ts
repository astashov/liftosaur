import { parser } from "../../pages/planner/plannerExerciseParser";
import { PlannerNodeName } from "../../pages/planner/plannerExerciseStyles";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

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

export function LiftoEditorBrain_computeStyledRanges(text: string): ILiftoEditorStyledRange[] {
  const styles = nodeStyles();
  const ranges: ILiftoEditorStyledRange[] = [];
  const tree = parser.parse(text);
  tree.iterate({
    enter: (node) => {
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

export interface INumericToken {
  start: number;
  end: number;
  text: string;
  kind: "weight" | "percentage" | "timer" | "number";
}

const wholeNumericTokenKinds: Partial<Record<PlannerNodeName, INumericToken["kind"]>> = {
  [PlannerNodeName.Weight]: "weight",
  [PlannerNodeName.Percentage]: "percentage",
  [PlannerNodeName.Timer]: "timer",
};

export function LiftoEditorBrain_numericTokens(text: string): INumericToken[] {
  const tokens: INumericToken[] = [];
  const tree = parser.parse(text);
  tree.iterate({
    enter: (node) => {
      const whole = wholeNumericTokenKinds[node.name as PlannerNodeName];
      if (whole != null) {
        tokens.push({ start: node.from, end: node.to, text: text.slice(node.from, node.to), kind: whole });
        return false;
      }
      if (node.name === PlannerNodeName.Int || node.name === PlannerNodeName.Float) {
        tokens.push({ start: node.from, end: node.to, text: text.slice(node.from, node.to), kind: "number" });
        return false;
      }
      return true;
    },
  });
  return tokens;
}

const stepByKind: Record<INumericToken["kind"], (suffix: string) => number> = {
  weight: (suffix) => (suffix === "kg" ? 2.5 : 5),
  percentage: () => 2.5,
  timer: () => 15,
  number: () => 1,
};

export function LiftoEditorBrain_stepToken(token: INumericToken, direction: 1 | -1): string | undefined {
  const match = token.text.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
  if (match == null) {
    return undefined;
  }
  const [, sign, num, suffix] = match;
  const value = parseFloat(`${sign}${num}`);
  const step = stepByKind[token.kind](suffix);
  const next = Math.round((value + step * direction) * 100) / 100;
  return `${next}${suffix}`;
}

export interface ILiftoEditorHandle {
  setSelection: (start: number, end: number) => void;
  replaceRange: (start: number, end: number, text: string) => void;
  getText: () => string;
}
