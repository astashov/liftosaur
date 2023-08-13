/* eslint-disable @typescript-eslint/ban-types */
import { ILensRecordingPayload, LensBuilder } from "lens-shmens";
import {
  IEquipment,
  IExerciseId,
  IProgram,
  IProgramExercise,
  IProgramExerciseWarmupSet,
  IProgramState,
  ISettings,
  IUnit,
  IWeight,
} from "../types";
import { CollectionUtils } from "../utils/collection";
import { UidFactory } from "../utils/generator";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { Exercise, IExercise, warmupValues } from "./exercise";
import { Program } from "./program";
import { IProgramExerciseExample, ProgramExercise } from "./programExercise";
import { Weight } from "./weight";

export namespace EditProgramLenses {
  export function addStateVariable<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    newName: string,
    newType: IUnit,
    newUserPrompted?: boolean
  ): ILensRecordingPayload<T>[] {
    return [
      prefix.p("state").recordModify((state) => {
        const newState = { ...state };
        let newValue: IWeight | number;
        if (newType === "lb" || newType === "kg") {
          newValue = Weight.build(0, newType);
        } else {
          newValue = 0;
        }
        newState[newName] = newValue;
        return newState;
      }),
      prefix.p("stateMetadata").recordModify((stateMetadata) => ({
        ...(stateMetadata || {}),
        ...(newUserPrompted
          ? { [newName]: { ...((stateMetadata || {})[newName] || {}), userPrompted: newUserPrompted } }
          : {}),
      })),
    ];
  }

  export function reorderDays<T>(
    prefix: LensBuilder<T, IProgram, {}>,
    startDayIndex: number,
    endDayIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("days").recordModify((days) => {
      const newDays = [...days];
      const [daysToMove] = newDays.splice(startDayIndex, 1);
      newDays.splice(endDayIndex, 0, daysToMove);
      return newDays;
    });
  }

  export function reorderExercises<T>(
    prefix: LensBuilder<T, IProgram, {}>,
    dayIndex: number,
    startExerciseIndex: number,
    endExceciseIndex: number
  ): ILensRecordingPayload<T> {
    return prefix
      .p("days")
      .i(dayIndex)
      .p("exercises")
      .recordModify((exercises) => {
        const newExercises = [...exercises];
        const [exercisesToMove] = newExercises.splice(startExerciseIndex, 1);
        newExercises.splice(endExceciseIndex, 0, exercisesToMove);
        return newExercises;
      });
  }

  export function removeProgramExercise<T>(
    prefix: LensBuilder<T, IProgram, {}>,
    exerciseId: string
  ): ILensRecordingPayload<T> {
    return prefix.p("exercises").recordModify((es) => es.filter((e) => e.id !== exerciseId));
  }

  export function setDescription<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string,
    index: number
  ): ILensRecordingPayload<T> {
    return prefix.p("descriptions").recordModify((descriptions) => {
      const newDescriptions = [...descriptions];
      newDescriptions[index] = value;
      return newDescriptions;
    });
  }

  export function copyProgramExercise<T>(
    prefix: LensBuilder<T, IProgram, {}>,
    exercise: IProgramExercise,
    dayIndex?: number
  ): ILensRecordingPayload<T>[] {
    const newName = `${exercise.name} Copy`;
    const arr: ILensRecordingPayload<T>[] = [];
    const newExercise: IProgramExercise = {
      ...ObjectUtils.clone(exercise),
      name: newName,
      id: UidFactory.generateUid(8),
    };
    arr.push(prefix.p("exercises").recordModify((es) => [...es, newExercise]));
    if (dayIndex != null) {
      arr.push(toggleDayExercise(prefix, dayIndex, newExercise.id));
      arr.push(
        prefix
          .p("days")
          .i(dayIndex)
          .recordModify((day) => {
            const oldIndex = day.exercises.findIndex((e) => e.id === exercise.id);
            const newIndex = day.exercises.findIndex((e) => e.id === newExercise.id);
            const newExercises = [...day.exercises];
            const ex = newExercises.splice(newIndex, 1)[0];
            newExercises.splice(oldIndex + 1, 0, ex);
            return { ...day, exercises: newExercises };
          })
      );
    }
    return arr;
  }

  export function toggleDayExercise<T>(
    prefix: LensBuilder<T, IProgram, {}>,
    dayIndex: number,
    exerciseId: string
  ): ILensRecordingPayload<T> {
    return prefix
      .p("days")
      .i(dayIndex)
      .p("exercises")
      .recordModify((es) => {
        if (es.some((e) => e.id === exerciseId)) {
          return es.filter((e) => e.id !== exerciseId);
        } else {
          return [...es, { id: exerciseId }];
        }
      });
  }

  export function changeExerciseEquipment<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    newEquipment?: IEquipment
  ): ILensRecordingPayload<T> {
    return prefix.p("exerciseType").p("equipment").record(newEquipment);
  }

  export function changeExerciseId<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    settings: ISettings,
    newId: IExerciseId
  ): ILensRecordingPayload<T>[] {
    const exercise = Exercise.get({ id: newId, equipment: "barbell" }, settings.exercises);
    return [
      prefix.p("exerciseType").p("id").record(exercise.id),
      prefix.p("exerciseType").p("equipment").record(exercise.defaultEquipment),
      prefix.p("state").recordModify((oldState) => {
        if ("weight" in oldState) {
          return {
            ...oldState,
            weight: settings.units === "kg" ? exercise.startingWeightKg : exercise.startingWeightLb,
          };
        } else {
          return oldState;
        }
      }),
      prefix.p("name").record(exercise.name),
    ];
  }

  export function editReuseLogicStateVariable<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    reuseLogicId: string,
    stateKey: string,
    newValue?: string
  ): ILensRecordingPayload<T> {
    return prefix
      .pi("reuseLogic")
      .pi("states")
      .pi(reuseLogicId)
      .recordModify((state) => {
        return updateStateVariable(state, stateKey, newValue);
      });
  }

  export function editStateVariable<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    stateKey: string,
    newValue?: string
  ): ILensRecordingPayload<T> {
    return prefix.p("state").recordModify((state) => {
      return updateStateVariable(state, stateKey, newValue);
    });
  }

  export function removeStateVariableMetadata<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    stateKey: string
  ): ILensRecordingPayload<T> {
    return prefix.p("stateMetadata").recordModify((state) => {
      const newState = { ...state };
      delete newState[stateKey];
      return newState;
    });
  }

  export function reuseLogic<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    allProgramExercises: IProgramExercise[],
    id: string
  ): ILensRecordingPayload<T> {
    return prefix.p("reuseLogic").recordModify((oldReuseLogic) => {
      const reuseProgram = allProgramExercises.filter((pe) => pe.id === id)[0];
      if (reuseProgram == null) {
        return { selected: undefined, states: oldReuseLogic?.states || {} };
      }
      const states = oldReuseLogic?.states || {};
      let state = states[id];
      if (state == null) {
        state = { ...reuseProgram.state };
      } else {
        state = ProgramExercise.mergeStates(state, reuseProgram.state);
      }
      return {
        selected: id,
        states: { ...states, [id]: state },
      };
    });
  }

  export function properlyUpdateStateVariable<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    programExercise: IProgramExercise,
    stateKey: string,
    newValue?: string
  ): ILensRecordingPayload<T>[] {
    const reuseLogicId = programExercise.reuseLogic?.selected;
    if (reuseLogicId) {
      return [EditProgramLenses.editReuseLogicStateVariable(prefix, reuseLogicId, stateKey, newValue)];
    } else {
      if (newValue == null) {
        return [
          EditProgramLenses.removeStateVariableMetadata(prefix, stateKey),
          EditProgramLenses.editStateVariable(prefix, stateKey, newValue),
        ];
      } else {
        return [EditProgramLenses.editStateVariable(prefix, stateKey, newValue)];
      }
    }
  }

  export function switchStateVariablesToUnit<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    settings: ISettings
  ): ILensRecordingPayload<T>[] {
    return [
      prefix.recordModify((programExercise) => {
        return ProgramExercise.switchToUnit(programExercise, settings);
      }),
    ];
  }

  export function setReps<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string,
    variationIndex: number,
    setIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("variations").i(variationIndex).p("sets").i(setIndex).p("repsExpr").record(value);
  }

  export function setRpe<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string,
    variationIndex: number,
    setIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("variations").i(variationIndex).p("sets").i(setIndex).p("rpeExpr").record(value);
  }

  export function setLabel<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string,
    variationIndex: number,
    setIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("variations").i(variationIndex).p("sets").i(setIndex).p("label").record(value.slice(0, 8));
  }

  export function setTimer<T>(prefix: LensBuilder<T, IProgramExercise, {}>, value: string): ILensRecordingPayload<T> {
    return prefix.p("timerExpr").record(value);
  }

  export function setQuickAddSets<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: boolean
  ): ILensRecordingPayload<T> {
    return prefix.p("quickAddSets").record(value);
  }

  export function setEnableRpe<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: boolean
  ): ILensRecordingPayload<T> {
    return prefix.p("enableRpe").record(value);
  }

  export function setWeight<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string,
    variationIndex: number,
    setIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("variations").i(variationIndex).p("sets").i(setIndex).p("weightExpr").record(value);
  }

  export function setAmrap<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: boolean,
    variationIndex: number,
    setIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("variations").i(variationIndex).p("sets").i(setIndex).p("isAmrap").record(value);
  }

  export function setLogRpe<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: boolean,
    variationIndex: number,
    setIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("variations").i(variationIndex).p("sets").i(setIndex).p("logRpe").record(value);
  }

  export function setExerciseFinishDayExpr<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string
  ): ILensRecordingPayload<T> {
    return prefix.p("finishDayExpr").record(value);
  }

  export function setExerciseVariationExpr<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string
  ): ILensRecordingPayload<T> {
    return prefix.p("variationExpr").record(value);
  }

  export function addVariation<T>(prefix: LensBuilder<T, IProgramExercise, {}>): ILensRecordingPayload<T> {
    return prefix.p("variations").recordModify((v) => {
      return [...v, Program.createVariation()];
    });
  }

  export function removeVariation<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    variationIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("variations").recordModify((v) => v.filter((_, i) => i !== variationIndex));
  }

  export function duplicateVariation<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    variationIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("variations").recordModify((v) => {
      const variation = v[variationIndex];
      const newVariation = ObjectUtils.clone(variation);
      const newVariations = [...v];
      newVariations.splice(variationIndex + 1, 0, newVariation);
      return newVariations;
    });
  }

  export function addSet<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    variationIndex: number
  ): ILensRecordingPayload<T> {
    return prefix
      .p("variations")
      .i(variationIndex)
      .p("sets")
      .recordModify((sets) => {
        const lastSet = sets[sets.length - 1] || {
          repsExpr: "5",
          weightExpr: "0",
          isAmrap: false,
        };
        const set = { ...lastSet };
        return [...sets, set];
      });
  }

  export function reorderSets<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    variationIndex: number,
    startSetIndex: number,
    endSetIndex: number
  ): ILensRecordingPayload<T> {
    return prefix
      .p("variations")
      .i(variationIndex)
      .p("sets")
      .recordModify((sets) => {
        const newSets = [...sets];
        const [setsToMove] = newSets.splice(startSetIndex, 1);
        newSets.splice(endSetIndex, 0, setsToMove);
        return newSets;
      });
  }

  export function removeSet<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    variationIndex: number,
    setIndex: number
  ): ILensRecordingPayload<T> {
    return prefix
      .p("variations")
      .i(variationIndex)
      .p("sets")
      .recordModify((sets) => sets.filter((s, i) => i !== setIndex));
  }

  export function setDefaultWarmupSets<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    exercise: IExercise,
    units: IUnit
  ): ILensRecordingPayload<T> {
    const defaultWarmup = (exercise.defaultWarmup && warmupValues(units)[exercise.defaultWarmup]) || [];
    return prefix.p("warmupSets").record(defaultWarmup);
  }

  export function addWarmupSet<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    ws: IProgramExerciseWarmupSet[],
    unit: IUnit
  ): ILensRecordingPayload<T> {
    const warmupSets = [...ws];
    const lastWarmupSet = warmupSets[warmupSets.length - 1];
    if (lastWarmupSet != null) {
      warmupSets.push({
        reps: lastWarmupSet.reps,
        threshold: Weight.clone(lastWarmupSet.threshold),
        value: typeof lastWarmupSet.value === "number" ? lastWarmupSet.value : Weight.clone(lastWarmupSet.value),
      });
    } else {
      warmupSets.push({
        reps: 5,
        threshold: unit === "kg" ? Weight.build(20, "kg") : Weight.build(45, "lb"),
        value: 0.8,
      });
    }
    return prefix.p("warmupSets").record(warmupSets);
  }

  export function removeWarmupSet<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    warmupSets: IProgramExerciseWarmupSet[],
    index: number
  ): ILensRecordingPayload<T> {
    return prefix.p("warmupSets").record(CollectionUtils.removeAt(warmupSets, index));
  }

  export function updateWarmupSet<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    warmupSets: IProgramExerciseWarmupSet[],
    index: number,
    newWarmupSet: IProgramExerciseWarmupSet
  ): ILensRecordingPayload<T> {
    const newWarmupSets = CollectionUtils.setAt(warmupSets, index, newWarmupSet);
    return prefix.p("warmupSets").record(newWarmupSets);
  }

  export function applyProgramExerciseExample<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    example: IProgramExerciseExample
  ): ILensRecordingPayload<T> {
    return prefix.recordModify((pe) => {
      const newPe = {
        ...ObjectUtils.clone(pe),
        finishDayExpr: example.finishDayExpr,
      };
      for (const key of Object.keys(example.state)) {
        const oldValue = newPe.state[key];
        const exampleValue = example.state[key];
        if (oldValue == null) {
          newPe.state[key] = exampleValue;
        } else {
          const oldType = ProgramExercise.getStateVariableType(oldValue);
          const exampleType = ProgramExercise.getStateVariableType(exampleValue);
          if (oldType !== exampleType) {
            newPe.state[key] = exampleValue;
          }
        }
      }
      if (newPe.variations.length > 1 || example.rules.sets === "replace") {
        newPe.variations = [{ sets: [...example.sets] }];
      } else {
        for (const set of newPe.variations[0].sets) {
          if (example.rules.reps === "replace") {
            set.repsExpr = example.sets[0]?.repsExpr;
          } else if (example.rules.reps === "keep_if_has_vars") {
            const oldVars = set.repsExpr.match(/state\.(\w+)/g)?.map((r) => r.replace("state.", "")) || [];
            const exampleVarsMatch =
              example.sets[0]?.repsExpr.match(/state\.(\w+)/g)?.map((r) => r.replace("state.", "")) || [];
            const hasAllVars = exampleVarsMatch.every((v) => oldVars.indexOf(v) !== -1);
            if (!hasAllVars) {
              set.repsExpr = example.sets[0]?.repsExpr;
            }
          }

          if (example.rules.weight === "replace") {
            set.weightExpr = example.sets[0]?.weightExpr;
          } else if (example.rules.weight === "keep_if_has_vars") {
            const oldVars = set.weightExpr.match(/state\.(\w+)/g)?.map((r) => r.replace("state.", "")) || [];
            const exampleVarsMatch =
              example.sets[0]?.weightExpr.match(/state\.(\w+)/g)?.map((r) => r.replace("state.", "")) || [];
            const hasAllVars = exampleVarsMatch.every((v) => oldVars.indexOf(v) !== -1);
            if (!hasAllVars) {
              set.weightExpr = example.sets[0]?.weightExpr;
            }
          }
        }
      }
      return newPe;
    });
  }

  export function addDescription<T>(prefix: LensBuilder<T, IProgramExercise, {}>): ILensRecordingPayload<T> {
    return prefix.p("descriptions").recordModify((descriptions) => [...descriptions, ""]);
  }

  export function removeDescription<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    index: number
  ): ILensRecordingPayload<T> {
    return prefix.p("descriptions").recordModify((descriptions) => CollectionUtils.removeAt(descriptions, index));
  }

  export function changeDescription<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string,
    index: number
  ): ILensRecordingPayload<T> {
    return prefix.p("descriptions").recordModify((descriptions) => CollectionUtils.setAt(descriptions, index, value));
  }

  export function changeDescriptionExpr<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string
  ): ILensRecordingPayload<T> {
    return prefix.p("descriptionExpr").record(value);
  }

  export function reorderDescriptions<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    startIndex: number,
    endIndex: number
  ): ILensRecordingPayload<T> {
    return prefix
      .p("descriptions")
      .recordModify((descriptions) => CollectionUtils.reorder(descriptions, startIndex, endIndex));
  }

  export function updateSimpleExercise<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    units: IUnit,
    sets: number,
    reps: number,
    weight: number
  ): ILensRecordingPayload<T>[] {
    return [
      prefix
        .p("variations")
        .i(0)
        .p("sets")
        .record(
          Array.apply(null, Array(sets)).map(() => ({
            repsExpr: reps.toString(),
            weightExpr: "state.weight",
            isAmrap: false,
          }))
        ),
      prefix.p("state").p("weight").record(Weight.build(weight, units)),
    ];
  }

  export function setProgression<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    progression?: { increment: number; unit: IUnit | "%"; attempts: number },
    deload?: { decrement: number; unit: IUnit | "%"; attempts: number }
  ): ILensRecordingPayload<T>[] {
    const lbs: ILensRecordingPayload<T>[] = [];
    lbs.push(prefix.p("state").p("successes").record(0));
    lbs.push(prefix.p("state").p("failures").record(0));
    const finishDayExpr = [];
    if (progression != null) {
      finishDayExpr.push(
        StringUtils.unindent(`
          // Simple Exercise Progression script '${progression.increment}${progression.unit},${progression.attempts}'
          if (completedReps >= reps) {
            state.successes = state.successes + 1
            if (state.successes >= ${progression.attempts}) {
              ${
                progression.unit === "%"
                  ? `state.weight = roundWeight(state.weight * ${1 + progression.increment / 100})`
                  : `state.weight = state.weight + ${progression.increment}${progression.unit}`
              }
              state.successes = 0
              state.failures = 0
            }
          }
          // End Simple Exercise Progression script
        `)
      );
    }
    if (deload != null) {
      finishDayExpr.push(
        StringUtils.unindent(`
          // Simple Exercise Deload script '${deload.decrement}${deload.unit},${deload.attempts}'
          if (!(completedReps >= reps)) {
            state.failures = state.failures + 1
            if (state.failures >= ${deload.attempts}) {
              ${
                deload.unit === "%"
                  ? `state.weight = roundWeight(state.weight * ${1 - deload.decrement / 100})`
                  : `state.weight = state.weight - ${deload.decrement}${deload.unit}`
              }
              state.successes = 0
              state.failures = 0
            }
          }
          // End Simple Exercise Deload script
        `)
      );
    }
    lbs.push(prefix.p("finishDayExpr").record(finishDayExpr.join("\n")));
    return lbs;
  }
}

function updateStateVariable(state: IProgramState, stateKey: string, newValue?: string): IProgramState {
  if (newValue === "") {
    newValue = "0";
  }
  let v = newValue != null && newValue !== "" ? parseFloat(newValue) : null;
  if (v != null && isNaN(v)) {
    v = 0;
  }
  const newState = { ...state };
  const value = state[stateKey];
  if (Weight.is(value) && v != null && v < 0) {
    v = 0;
  }
  if (v != null) {
    newState[stateKey] = Weight.is(value) ? Weight.build(v || 0, value.unit) : v;
  } else {
    delete newState[stateKey];
  }
  return newState;
}
