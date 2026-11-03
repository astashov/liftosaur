import { SyntaxNode } from "@lezer/common";
import {
  IEditorToken,
  ILiftoEditorContext,
  LiftoEditorBrain_contextAt,
  LiftoEditorBrain_enclosingSetGroup,
  LiftoEditorBrain_scriptReuseBody,
  LiftoEditorBrain_tokens,
  LiftoEditorParseCache,
} from "./liftoEditorBrain";
import { ILiftoEditorPill, ILiftoEditorPillKind } from "./liftoEditorActions";
import { ILiftoEditorAdapter, ILiftoEditorEditPlan } from "./liftoEditorAdapter";
import { PlannerNodeName } from "../../pages/planner/plannerExerciseStyles";
import { PlannerDocument_descriptionAt } from "../../pages/planner/models/plannerDocument";
import {
  ICompletionResult,
  PlannerCompletions_at,
  PlannerCompletionsIndex,
} from "../../pages/planner/plannerCompletions";
import type { ILiftoEditorMode } from "./liftoEditorSession";
import type { IAllCustomExercises } from "../../types";

// How much of the program the document holds — one exercise's declaration, or a whole day.
// Not about where the editor is embedded: a day is edited both inline on the Program screen
// and in its own sheet, and both want the same actions (see railPills).
export type ILiftoEditorScope = "exercise" | "day" | "preview";

type IPreviewGlobalField = "weight" | "rpe" | "timer" | "setTimer";

const previewDeniedKinds: ReadonlySet<ILiftoEditorPillKind> = new Set<ILiftoEditorPillKind>([
  "reuse",
  "reuseScript",
  "fromWeekDay",
  "repeat",
  "forcedOrder",
  "addLabel",
]);

const previewGlobalFieldOfKind: Partial<Record<ILiftoEditorPillKind, IPreviewGlobalField>> = {
  addWeight: "weight",
  addRpe: "rpe",
  addSetTimer: "setTimer",
  addRestTimer: "timer",
};

export class LiftoEditorPlannerAdapter implements ILiftoEditorAdapter {
  constructor(
    public readonly scope: ILiftoEditorScope = "exercise",
    public readonly cache: LiftoEditorParseCache = new LiftoEditorParseCache()
  ) {}

  public tokens(text: string): IEditorToken[] {
    return LiftoEditorBrain_tokens(this.cache, text);
  }

  public contextAt(text: string, index: number): ILiftoEditorContext {
    return LiftoEditorBrain_contextAt(this.cache, text, index);
  }

  public canTap(text: string, index: number): boolean {
    return this.scope !== "preview" || index >= this.previewLockedEnd(text);
  }

  public canFreeform(): boolean {
    return this.scope !== "preview";
  }

  public completions(
    session: { mode: ILiftoEditorMode; text: string },
    caret: number | undefined,
    args: { customExercises?: IAllCustomExercises; exerciseFullNames?: string[]; index: PlannerCompletionsIndex }
  ): ICompletionResult | undefined {
    if (session.mode !== "freeform" || caret == null || caret > session.text.length) {
      return undefined;
    }
    return PlannerCompletions_at(session.text, caret, { ...args, cache: this.cache });
  }

  // "Edit reused exercise…" opens a second editor on the reuse target. Inline that's noise:
  // the whole day is already on screen, so the target is a few lines up in this very editor.
  // PlannerProgramExercise_sets lets an own global override the set, so a per-set weight, RPE or
  // timer pill under one would insert dead text.
  public railPills(text: string, pills: ILiftoEditorPill[]): ILiftoEditorPill[] {
    if (this.scope === "day") {
      return pills.filter((pill) => pill.action !== "editReuse");
    }
    if (this.scope !== "preview") {
      return pills;
    }
    const lockedEnd = this.previewLockedEnd(text);
    const globalFields = this.previewGlobalFields(text);
    return pills.filter((pill) => {
      if (pill.action != null || previewDeniedKinds.has(pill.kind) || pill.start < lockedEnd) {
        return false;
      }
      const field = previewGlobalFieldOfKind[pill.kind];
      return field == null || !globalFields.has(field);
    });
  }

  public removal(text: string, context: ILiftoEditorContext, levelIndex: number): ILiftoEditorEditPlan | undefined {
    const levels = context.levels;
    const level = levels[levelIndex];
    if (level == null || (this.scope === "preview" && level.start < this.previewLockedEnd(text))) {
      return undefined;
    }
    let nodeName = level.nodeName;
    let start = level.start;
    let end = level.end;
    const scriptBody = LiftoEditorBrain_scriptReuseBody(this.cache, text, level);
    if (scriptBody != null) {
      return { edits: [{ start: scriptBody.start, end: scriptBody.end, text: "{~ ~}" }] };
    }
    // A description occupies whole lines rather than sitting inside one, so removing it is a
    // question about lines and the blank ones around them — which the document answers, the same
    // way it answers which runs are descriptions at all.
    if (nodeName === PlannerNodeName.LineComment) {
      const found = PlannerDocument_descriptionAt(text, start, this.cache.parse(text));
      const description = found != null ? found.siblings[found.index] : undefined;
      return description != null
        ? { edits: [{ start: description.removeFrom, end: description.removeTo, text: "" }] }
        : undefined;
    }
    // Removing a group's sets×reps alone leaves nonsense ("warmup: 40%"; "3x8 100lb" minus
    // "3x8" reads as globals) — promote to the whole set group. And when a property's whole
    // value would go — its function ("id:" minus "tags(2)"), the last warmup group, or the
    // Warmup sets level itself — take the whole property: a dangling "name:" doesn't parse.
    const group = LiftoEditorBrain_enclosingSetGroup(this.cache, text, level);
    const removesPropertyValue =
      (group?.isOnlyGroup === true && group.nodeName === "WarmupExerciseSet") ||
      nodeName === "WarmupExerciseSets" ||
      nodeName === "FunctionExpression";
    const propertyLevel = removesPropertyValue
      ? levels
          .slice(0, levelIndex)
          .reverse()
          .find((l) => l.nodeName === "ExerciseProperty")
      : undefined;
    const target = propertyLevel ?? group;
    if (target != null) {
      nodeName = target.nodeName;
      start = target.start;
      end = target.end;
    }
    // A removed item takes a separator with it. For list items (set groups and state vars
    // separated by ",", exercise variations by "|") a trailing separator wins — "3x8, 5x5"
    // minus the first group must keep its leading " / ". Everything else eats its leading
    // " / " or ", ", so "5x5 / 100kg / progress" minus the weight yields "5x5 / progress".
    const isExerciseVariation = nodeName === "ExerciseVariation";
    const listSeparator =
      nodeName === "ExerciseSet" || nodeName === "WarmupExerciseSet" || nodeName === "KeyValue"
        ? ","
        : isExerciseVariation
          ? "|"
          : undefined;
    let j = end;
    while (j < text.length && text[j] === " ") {
      j += 1;
    }
    if (listSeparator != null && text[j] === listSeparator) {
      j += 1;
      while (j < text.length && text[j] === " ") {
        j += 1;
      }
      end = j;
    } else {
      let i = start - 1;
      while (i >= 0 && text[i] === " ") {
        i -= 1;
      }
      if (i >= 0 && (isExerciseVariation ? text[i] === "|" : text[i] === "/" || text[i] === ",")) {
        i -= 1;
        while (i >= 0 && text[i] === " ") {
          i -= 1;
        }
      }
      // With no separator this still eats the leading spaces, so removing a mid-group item
      // ("3x8 auto 60s" minus "auto") doesn't leave a double space behind.
      start = i + 1;
    }
    return { edits: [{ start, end, text: "" }] };
  }

  private previewExerciseNode(text: string): SyntaxNode | null {
    return this.cache.parse(text).topNode.getChild(PlannerNodeName.ExerciseExpression);
  }

  private previewLockedEnd(text: string): number {
    const exercise = this.previewExerciseNode(text);
    const variations = exercise?.getChild(PlannerNodeName.ExerciseVariations);
    const repeat = exercise?.getChild(PlannerNodeName.Repeat);
    return repeat?.to ?? variations?.to ?? 0;
  }

  private previewGlobalFields(text: string): Set<IPreviewGlobalField> {
    const fields = new Set<IPreviewGlobalField>();
    const exercise = this.previewExerciseNode(text);
    for (const section of exercise?.getChildren(PlannerNodeName.ExerciseSection) ?? []) {
      for (const set of section.getChild(PlannerNodeName.ExerciseSets)?.getChildren(PlannerNodeName.ExerciseSet) ??
        []) {
        if (set.getChild(PlannerNodeName.SetPart) != null) {
          continue;
        }
        if (
          set.getChild(PlannerNodeName.WeightWithPlus) != null ||
          set.getChild(PlannerNodeName.PercentageWithPlus) != null ||
          set.getChild(PlannerNodeName.AskWeight) != null
        ) {
          fields.add("weight");
        }
        if (set.getChild(PlannerNodeName.Rpe) != null) {
          fields.add("rpe");
        }
        if (set.getChild(PlannerNodeName.Timer) != null) {
          fields.add("timer");
        }
        // `30s|60s` sets both timers; `30s|?` leaves the rest timer to the per-set values.
        const setTimer = set.getChild(PlannerNodeName.SetTimer);
        if (setTimer != null) {
          fields.add("setTimer");
          if (!text.slice(setTimer.from, setTimer.to).endsWith("?")) {
            fields.add("timer");
          }
        }
      }
    }
    return fields;
  }
}
