import type { IPercentage, IProgramState, IProgramStateMetadata, ISettings, IWeight } from "../../types";
import { PlannerStateVars_fromArgs } from "../../pages/planner/models/plannerStateVars";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { PlannerKey_fromFullName } from "../../pages/planner/plannerKey";
import type { ILiftoEditorStateVarEntry, ILiftoEditorStateVarsTarget } from "./liftoEditorActions";
import {
  PlannerProgramExercise_getProgressScript,
  PlannerProgramExercise_getState,
  PlannerProgramExercise_getStateMetadata,
  PlannerProgramExercise_getUpdateScript,
} from "../../pages/planner/models/plannerProgramExercise";
import { ScriptRunner } from "../../parser";
import { Weight_print } from "../../models/weight";
import { ObjectUtils_entries, ObjectUtils_keys } from "../../utils/object";

export type ILiftoEditorStateVarValue = number | IWeight | IPercentage;

export interface ILiftoEditorStateVar {
  name: string;
  value: ILiftoEditorStateVarValue;
  userPrompted: boolean;
}

// One row per variable the exercise has: the ones it declares itself, and the ones it
// inherits from the exercise its progress reuses. An inherited one turns into a declared
// one the moment its value changes — that's what an override is in Liftoscript.
export interface ILiftoEditorStateVarRow {
  name: string;
  value: ILiftoEditorStateVarValue;
  userPrompted: boolean;
  defaultValue?: ILiftoEditorStateVarValue;
  isDeclared: boolean;
}

// The syntax tree hands over name/value pairs; this turns each value token into the number,
// weight or percentage the evaluator would make of it. One argument at a time, so the order
// they're written in survives (the evaluator's map doesn't keep it).
export function LiftoEditorStateVars_fromEntries(entries: ILiftoEditorStateVarEntry[]): ILiftoEditorStateVar[] {
  const vars: ILiftoEditorStateVar[] = [];
  for (const entry of entries) {
    const { state } = PlannerStateVars_fromArgs([`${entry.name}: ${entry.value}`]);
    for (const name of ObjectUtils_keys(state)) {
      vars.push({ name, value: state[name], userPrompted: entry.userPrompted });
    }
  }
  return vars;
}

// Both grammars have to accept the name. The planner's KeyValue keyword allows a leading
// underscore (`_x: 1` parses), but liftoscript's `state.name` doesn't — so a name starting
// with anything but a letter declares fine and then can't be read from the script it's for.
const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function LiftoEditorStateVars_sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "").replace(/^[^a-zA-Z]+/, "");
}

export function LiftoEditorStateVars_nameError(name: string, existingNames?: string[]): string | undefined {
  if (name === "") {
    return "Enter a variable name.";
  }
  if (!nameRegex.test(name)) {
    return "Variable names must start with a letter, and can only contain letters, numbers and underscores.";
  }
  if (existingNames?.includes(name)) {
    return `There's already a state variable named "${name}".`;
  }
  return undefined;
}

export function LiftoEditorStateVars_print(vars: ILiftoEditorStateVar[]): string {
  return vars.map((v) => `${v.name}${v.userPrompted ? "+" : ""}: ${Weight_print(v.value)}`).join(", ");
}

export function LiftoEditorStateVars_rows(
  vars: ILiftoEditorStateVar[],
  defaults?: IProgramState,
  defaultsMetadata?: IProgramStateMetadata
): ILiftoEditorStateVarRow[] {
  const declared = new Map(vars.map((v) => [v.name, v]));
  const rows: ILiftoEditorStateVarRow[] = [];
  for (const [name, defaultValue] of defaults != null ? ObjectUtils_entries(defaults) : []) {
    const own = declared.get(name);
    rows.push({
      name,
      value: own?.value ?? defaultValue,
      userPrompted: own?.userPrompted ?? !!defaultsMetadata?.[name]?.userPrompted,
      defaultValue,
      isDeclared: own != null,
    });
  }
  for (const v of vars) {
    if (defaults?.[v.name] == null) {
      rows.push({ name: v.name, value: v.value, userPrompted: v.userPrompted, isDeclared: true });
    }
  }
  return rows;
}

// Editing an inherited variable declares it here, which is how an override is written.
export function LiftoEditorStateVars_set(
  vars: ILiftoEditorStateVar[],
  name: string,
  update: Partial<Omit<ILiftoEditorStateVar, "name">>
): ILiftoEditorStateVar[] {
  const existing = vars.find((v) => v.name === name);
  if (existing == null) {
    return [...vars, { name, value: 0, userPrompted: false, ...update }];
  }
  return vars.map((v) => (v.name === name ? { ...v, ...update } : v));
}

export function LiftoEditorStateVars_remove(vars: ILiftoEditorStateVar[], name: string): ILiftoEditorStateVar[] {
  return vars.filter((v) => v.name !== name);
}

// Everything the sheet needs beyond the variables themselves: where the inherited ones come
// from, and every script that can reference them — progress declares the state, and update
// reads the same state, so a variable only update mentions still can't be deleted.
export interface ILiftoEditorStateVarsContext {
  defaults?: IProgramState;
  defaultsMetadata?: IProgramStateMetadata;
  sourceName?: string;
  progressScript?: string;
  updateScript?: string;
}

// Mirrors PlannerProgramExercise_getState's inheritance: an own progress declaration that
// reuses nothing inherits nothing, however the exercise itself reuses another one.
function progressSource(exercise: IPlannerProgramExercise): IPlannerProgramExercise | undefined {
  if (exercise.progress?.state != null && exercise.progress.reuse == null) {
    return undefined;
  }
  return exercise.progress?.reuse?.exercise ?? exercise.reuse?.exercise;
}

// Deleting a variable a script still reads breaks the program, and both of an exercise's
// scripts can read its state — progress declares it, update uses the same state.
export function LiftoEditorStateVars_isUsed(name: string, context: ILiftoEditorStateVarsContext): boolean {
  return (
    ScriptRunner.hasStateVariable(context.progressScript ?? "", name) ||
    ScriptRunner.hasStateVariable(context.updateScript ?? "", name)
  );
}

// A reuse target names an exercise the same way the evaluator resolves it — by planner key,
// not by display name. `Squat, Smith Machine` and `Squat` share a name, and matching on that
// picks whichever comes first in the program instead of the one `...Squat` really means.
export function LiftoEditorStateVars_findExercise(
  exercises: IPlannerProgramExercise[],
  fullName: string,
  settings: ISettings
): IPlannerProgramExercise | undefined {
  const key = PlannerKey_fromFullName(fullName, settings.exercises);
  return exercises.find((exercise) => exercise.key === key);
}

// What the sheet should believe, given both the live text and the last evaluation. The text
// wins wherever it says anything: a body spelled out there means the progress declares its
// own state and inherits nothing, and a reuse there names the source — both stay right when
// the evaluation still remembers the body the user has since replaced.
export function LiftoEditorStateVars_contextFor(
  target: ILiftoEditorStateVarsTarget,
  exercise: IPlannerProgramExercise | undefined,
  exercises: IPlannerProgramExercise[],
  settings: ISettings
): ILiftoEditorStateVarsContext {
  const find = (fullName: string): IPlannerProgramExercise | undefined =>
    LiftoEditorStateVars_findExercise(exercises, fullName, settings);
  const progress =
    target.progressScript != null
      ? { progressScript: target.progressScript }
      : target.progressReuse != null
        ? // An unresolvable target (mid-edit, or a typo the evaluation will flag) contributes
          // no defaults and no script — better an empty sheet than another exercise's values.
          (sourceContext(find(target.progressReuse)) ?? { sourceName: target.progressReuse })
        : LiftoEditorStateVars_context(exercise);
  const updateSource = target.updateReuse != null ? find(target.updateReuse) : exercise;
  return {
    ...progress,
    updateScript:
      target.updateScript ?? (updateSource != null ? PlannerProgramExercise_getUpdateScript(updateSource) : undefined),
  };
}

function sourceContext(source: IPlannerProgramExercise | undefined): ILiftoEditorStateVarsContext | undefined {
  return source != null
    ? {
        defaults: PlannerProgramExercise_getState(source),
        defaultsMetadata: PlannerProgramExercise_getStateMetadata(source),
        sourceName: source.fullName,
        progressScript: PlannerProgramExercise_getProgressScript(source),
      }
    : undefined;
}

export function LiftoEditorStateVars_context(
  exercise: IPlannerProgramExercise | undefined
): ILiftoEditorStateVarsContext {
  if (exercise == null) {
    return {};
  }
  return {
    ...(sourceContext(progressSource(exercise)) ?? {}),
    progressScript: PlannerProgramExercise_getProgressScript(exercise),
    updateScript: PlannerProgramExercise_getUpdateScript(exercise),
  };
}
