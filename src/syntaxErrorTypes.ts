import type { IDayData } from "./types";

export type ISyntaxErrorSharedDetails =
  | { type: "parse" }
  | { type: "unexpectedNode"; data: { node: string } }
  | { type: "internal"; data: { node: string } };

export type ILiftoscriptErrorDetails =
  | ISyntaxErrorSharedDetails
  | { type: "unknownFunction"; data: { name: string } }
  | { type: "fnArity"; data: { fn: string; expected: string; got: number } }
  | { type: "fnArgumentType"; data: { fn: string; index: number; argName?: string; hint?: string; got: string } }
  | { type: "fnArrayArgument"; data: { fn: string; argText: string } }
  | { type: "unknownVariable"; data: { name: string } }
  | { type: "unknownStateVariable"; data: { stateKey: string } }
  | { type: "notAnArray"; data: { name: string } }
  | { type: "readonlyVariable"; data: { name: string } }
  | { type: "missingVariableName" }
  | { type: "otherStateIsWriteOnly" }
  | { type: "tooManyIndexes"; data: { key: string; max: number } }
  | { type: "indexOutOfBounds"; data: { name: string; index: number } }
  | { type: "wildcardIndexOnRead" }
  | { type: "rangeIndexOnRead"; data: { name: string } }
  | { type: "indexNotAssignableHere"; data: { name: string } }
  | { type: "unknownAssignmentOperator"; data: { op: string; variable: string } }
  | { type: "unknownOperator"; data: { op: string } }
  | { type: "operatorOnArray"; data: { op: string } }
  | { type: "forInNotArray" }
  | { type: "malformedWeight" }
  | { type: "invalidWeightOperation" }
  | { type: "wrongResultType"; data: { expected: string } };

export type IPlannerReuseSection = "sets" | "progress" | "update" | "description";

// A Liftoscript error thrown inside a progress/update block is rethrown as a planner error, so a
// planner error can carry either language's details - flat, not nested, so consumers switch once.
export type IPlannerErrorDetails =
  | ILiftoscriptErrorDetails
  | { type: "unknownExercise"; data: { name: string } }
  | { type: "duplicateExerciseInDay"; data: { key: string } }
  | { type: "conflictingProperty"; data: { property: string; exercise: string; a: IDayData; b: IDayData } }
  | { type: "reuseTargetNotFound"; data: { fullName: string; week?: number; day?: number } }
  | { type: "reuseAmbiguous" }
  | { type: "reuseSelf"; data: { section: IPlannerReuseSection } }
  | { type: "reuseCycle" }
  | { type: "reuseChained"; data: { section: IPlannerReuseSection } }
  | { type: "reuseTargetMissingSection"; data: { section: IPlannerReuseSection } }
  | { type: "reuseTargetNotCustom"; data: { section: IPlannerReuseSection } }
  | { type: "reuseWithoutOwnSection"; data: { section: IPlannerReuseSection } }
  | { type: "reuseScriptNotFound"; data: { section: IPlannerReuseSection } }
  | { type: "reuseTargetMultipleVariations"; data: { fullName: string } }
  | { type: "reuseStateTypeMismatch"; data: { stateKey: string } }
  | { type: "reuseMissingStateVariable"; data: { stateKey: string } }
  | { type: "progressionArgument"; data: { fn: string; index: number; expected: string } }
  | { type: "progressionArity"; data: { fn: string; max: number } }
  | { type: "unknownProgression"; data: { name: string } }
  | { type: "unknownUpdate"; data: { name: string } }
  | { type: "customWithoutScript"; data: { section: IPlannerReuseSection } }
  | { type: "updateStateFromProgress" }
  | { type: "updateStateWithoutProgress" }
  | { type: "invalidStateVariable"; data: { value: string } }
  | { type: "missingPropertyValue"; data: { property: string } }
  | { type: "unknownProperty"; data: { name: string } }
  | { type: "unknownIdType"; data: { name: string } }
  | { type: "invalidTags" }
  | { type: "labelTooLong"; data: { max: number } }
  | { type: "weeksNotAllowedInDayMode" }
  | { type: "daysNotAllowedInDayMode" }
  | { type: "dayWithoutWeek" }
  | { type: "exerciseWithoutDay" }
  | { type: "unknownValidationError" }
  // The webview hands back a message and offsets only, so a round-tripped error has no details left.
  | { type: "fromWebview" };
