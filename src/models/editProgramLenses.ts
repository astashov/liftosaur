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
import { StringUtils } from "../utils/string";
import { Exercise, IExercise, warmupValues } from "./exercise";
import { Program } from "./program";
import { ProgramExercise } from "./programExercise";
import { Weight } from "./weight";

export namespace EditProgramLenses {
  export function addStateVariable<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    newName: string,
    newType: IUnit
  ): ILensRecordingPayload<T> {
    return prefix.p("state").recordModify((state) => {
      const newState = { ...state };
      let newValue: IWeight | number;
      if (newType === "lb" || newType === "kg") {
        newValue = Weight.build(0, newType);
      } else {
        newValue = 0;
      }
      newState[newName] = newValue;
      return newState;
    });
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

  export function copyProgramExercise<T>(
    prefix: LensBuilder<T, IProgram, {}>,
    exercise: IProgramExercise,
    dayIndex?: number
  ): ILensRecordingPayload<T>[] {
    const newName = `${exercise.name} Copy`;
    const arr: ILensRecordingPayload<T>[] = [];
    const newExercise: IProgramExercise = { ...exercise, name: newName, id: UidFactory.generateUid(8) };
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
      prefix.p("name").record(exercise.name),
      prefix.p("warmupSets").record(undefined),
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

  export function setReps<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    value: string,
    variationIndex: number,
    setIndex: number
  ): ILensRecordingPayload<T> {
    return prefix.p("variations").i(variationIndex).p("sets").i(setIndex).p("repsExpr").record(value);
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

  export function addSet<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    variationIndex: number
  ): ILensRecordingPayload<T> {
    return prefix
      .p("variations")
      .i(variationIndex)
      .p("sets")
      .recordModify((sets) => {
        const set = { ...sets[sets.length - 1] };
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
    exercise: IExercise
  ): ILensRecordingPayload<T> {
    const defaultWarmup = (exercise.defaultWarmup && warmupValues()[exercise.defaultWarmup]) || [];
    return prefix.p("warmupSets").record(defaultWarmup);
  }

  export function addWarmupSet<T>(
    prefix: LensBuilder<T, IProgramExercise, {}>,
    ws: IProgramExerciseWarmupSet[]
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
        threshold: Weight.build(45, "lb"),
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
  const v = newValue != null && newValue !== "" ? parseFloat(newValue) : null;
  const newState = { ...state };
  const value = state[stateKey];
  if (v != null) {
    newState[stateKey] = Weight.is(value) ? Weight.build(v, value.unit) : v;
  } else {
    delete newState[stateKey];
  }
  return newState;
}