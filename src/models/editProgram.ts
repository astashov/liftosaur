import { lb, lf, lbu } from "lens-shmens";
import { Program } from "./program";
import { Screen } from "./screen";
import { IDispatch } from "../ducks/types";
import { IExercise } from "./exercise";
import { ObjectUtils } from "../utils/object";
import { updateState, IState } from "./state";
import {
  IWeight,
  IUnit,
  IExerciseId,
  IEquipment,
  IProgram,
  IProgramExercise,
  ISettings,
  IProgramExerciseWarmupSet,
  IExerciseType,
  IPlannerProgram,
  IDayData,
} from "../types";
import { EditProgramLenses } from "./editProgramLenses";
import { IProgramExerciseExample } from "./programExercise";
import { UidFactory } from "../utils/generator";
import { IPlannerSettings, IPlannerState } from "../pages/planner/models/types";

interface I531Tms {
  squat: IWeight;
  benchPress: IWeight;
  deadlift: IWeight;
  overheadPress: IWeight;
}

export namespace EditProgram {
  export function addStateVariable(
    dispatch: IDispatch,
    newName?: string,
    newType?: IUnit,
    newUserPrompted?: boolean
  ): void {
    if (newName != null && newType != null) {
      updateState(
        dispatch,
        EditProgramLenses.addStateVariable(lb<IState>().pi("editExercise"), newName, newType, newUserPrompted)
      );
    }
  }

  export function editStateVariable(dispatch: IDispatch, stateKey: string, newValue?: string): void {
    updateState(dispatch, [EditProgramLenses.editStateVariable(lb<IState>().pi("editExercise"), stateKey, newValue)]);
  }

  export function properlyUpdateStateVariableInPlace(
    dispatch: IDispatch,
    programId: string,
    programExercise: IProgramExercise,
    stateKey: string,
    newValue?: string
  ): void {
    updateState(
      dispatch,
      EditProgramLenses.properlyUpdateStateVariable(
        lb<IState>().p("storage").p("programs").findBy("id", programId).p("exercises").findBy("id", programExercise.id),
        programExercise,
        stateKey,
        newValue
      )
    );
  }

  export function switchStateVariablesToUnit(dispatch: IDispatch, settings: ISettings): void {
    updateState(dispatch, EditProgramLenses.switchStateVariablesToUnit(lb<IState>().pi("editExercise"), settings));
  }

  export function switchStateVariablesToUnitInPlace(
    dispatch: IDispatch,
    programId: string,
    programExercise: IProgramExercise,
    settings: ISettings
  ): void {
    updateState(
      dispatch,
      EditProgramLenses.switchStateVariablesToUnit(
        lb<IState>().p("storage").p("programs").findBy("id", programId).p("exercises").findBy("id", programExercise.id),
        settings
      )
    );
  }

  export function properlyUpdateStateVariable<T>(
    dispatch: IDispatch,
    programExercise: IProgramExercise,
    stateKey: string,
    newValue?: string
  ): void {
    return updateState(
      dispatch,
      EditProgramLenses.properlyUpdateStateVariable(
        lb<IState>().pi("editExercise"),
        programExercise,
        stateKey,
        newValue
      )
    );
  }

  export function removeStateVariableMetadata(dispatch: IDispatch, stateKey: string): void {
    updateState(dispatch, [EditProgramLenses.removeStateVariableMetadata(lb<IState>().pi("editExercise"), stateKey)]);
  }

  export function editReuseLogicStateVariable(
    dispatch: IDispatch,
    reuseLogicId: string,
    stateKey: string,
    newValue?: string
  ): void {
    updateState(dispatch, [
      EditProgramLenses.editReuseLogicStateVariable(lb<IState>().pi("editExercise"), reuseLogicId, stateKey, newValue),
    ]);
  }

  export function changeExerciseName(dispatch: IDispatch, newName?: string): void {
    updateState(dispatch, [
      lb<IState>()
        .pi("editExercise")
        .p("name")
        .record(newName || ""),
    ]);
  }

  export function changeExerciseId(
    dispatch: IDispatch,
    settings: ISettings,
    oldExerciseType: IExerciseType,
    newId?: IExerciseId
  ): void {
    if (newId != null) {
      updateState(
        dispatch,
        EditProgramLenses.changeExerciseId(lb<IState>().pi("editExercise"), settings, oldExerciseType, newId)
      );
    }
  }

  export function deleteProgram(dispatch: IDispatch, program: IProgram, customPrograms: IProgram[]): void {
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((pgms) => pgms.filter((p) => p.id !== program.id)),
      lb<IState>()
        .p("storage")
        .p("deletedPrograms")
        .recordModify((pgms) => (program.clonedAt ? [...pgms, program.clonedAt] : pgms)),
      lb<IState>()
        .p("storage")
        .p("currentProgramId")
        .recordModify((id) => (id === program.id ? customPrograms.filter((p) => p.id !== program.id)[0].id : id)),
      lb<IState>()
        .p("storage")
        .p("deletedPrograms")
        .recordModify((pgms) => (program.clonedAt ? [...pgms, program.clonedAt] : pgms)),
    ]);
  }

  export function changeExerciseEquipment(dispatch: IDispatch, newEquipment?: IEquipment): void {
    updateState(dispatch, [EditProgramLenses.changeExerciseEquipment(lb<IState>().pi("editExercise"), newEquipment)]);
  }

  export function setDescription(dispatch: IDispatch, value: string, index: number): void {
    updateState(dispatch, [EditProgramLenses.setDescription(lb<IState>().pi("editExercise"), value, index)]);
  }

  export function setReps(dispatch: IDispatch, value: string, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      EditProgramLenses.setReps(lb<IState>().pi("editExercise"), value, variationIndex, setIndex),
    ]);
  }

  export function setMinReps(dispatch: IDispatch, value: string, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      EditProgramLenses.setMinReps(lb<IState>().pi("editExercise"), value, variationIndex, setIndex),
    ]);
  }

  export function setRpe(dispatch: IDispatch, value: string, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [EditProgramLenses.setRpe(lb<IState>().pi("editExercise"), value, variationIndex, setIndex)]);
  }

  export function setLabel(dispatch: IDispatch, value: string, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      EditProgramLenses.setLabel(lb<IState>().pi("editExercise"), value, variationIndex, setIndex),
    ]);
  }

  export function addDescription<T>(dispatch: IDispatch): void {
    updateState(dispatch, [EditProgramLenses.addDescription(lb<IState>().pi("editExercise"))]);
  }

  export function removeDescription<T>(dispatch: IDispatch, index: number): void {
    updateState(dispatch, [EditProgramLenses.removeDescription(lb<IState>().pi("editExercise"), index)]);
  }

  export function changeDescription<T>(dispatch: IDispatch, value: string, index: number): void {
    updateState(dispatch, [EditProgramLenses.changeDescription(lb<IState>().pi("editExercise"), value, index)]);
  }

  export function changeDescriptionExpr<T>(dispatch: IDispatch, value: string): void {
    updateState(dispatch, [EditProgramLenses.changeDescriptionExpr(lb<IState>().pi("editExercise"), value)]);
  }

  export function reorderDescriptions<T>(dispatch: IDispatch, startIndex: number, endIndex: number): void {
    updateState(dispatch, [
      EditProgramLenses.reorderDescriptions(lb<IState>().pi("editExercise"), startIndex, endIndex),
    ]);
  }

  export function setTimer(dispatch: IDispatch, value: string): void {
    updateState(dispatch, [EditProgramLenses.setTimer(lb<IState>().pi("editExercise"), value)]);
  }

  export function setQuickAddSets(dispatch: IDispatch, value: boolean): void {
    updateState(dispatch, [EditProgramLenses.setQuickAddSets(lb<IState>().pi("editExercise"), value)]);
  }

  export function setEnableRpe(dispatch: IDispatch, value: boolean): void {
    updateState(dispatch, [EditProgramLenses.setEnableRpe(lb<IState>().pi("editExercise"), value)]);
  }

  export function setEnableRepRanges(dispatch: IDispatch, value: boolean): void {
    updateState(dispatch, [EditProgramLenses.setEnableRepRanges(lb<IState>().pi("editExercise"), value)]);
  }

  export function setWeight(dispatch: IDispatch, value: string, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      EditProgramLenses.setWeight(lb<IState>().pi("editExercise"), value, variationIndex, setIndex),
    ]);
  }

  export function setAmrap(dispatch: IDispatch, value: boolean, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      EditProgramLenses.setAmrap(lb<IState>().pi("editExercise"), value, variationIndex, setIndex),
    ]);
  }

  export function setLogRpe(dispatch: IDispatch, value: boolean, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [
      EditProgramLenses.setLogRpe(lb<IState>().pi("editExercise"), value, variationIndex, setIndex),
    ]);
  }

  export function setExerciseFinishDayExpr(dispatch: IDispatch, value: string): void {
    updateState(dispatch, [EditProgramLenses.setExerciseFinishDayExpr(lb<IState>().pi("editExercise"), value)]);
  }

  export function setExerciseVariationExpr(dispatch: IDispatch, value: string): void {
    updateState(dispatch, [EditProgramLenses.setExerciseVariationExpr(lb<IState>().pi("editExercise"), value)]);
  }

  export function addVariation(dispatch: IDispatch): void {
    updateState(dispatch, [EditProgramLenses.addVariation(lb<IState>().pi("editExercise"))]);
  }

  export function removeVariation(dispatch: IDispatch, variationIndex: number): void {
    updateState(dispatch, [EditProgramLenses.removeVariation(lb<IState>().pi("editExercise"), variationIndex)]);
  }

  export function setName(dispatch: IDispatch, program: IProgram, name: string): void {
    updateState(dispatch, [lb<IState>().p("storage").p("programs").findBy("id", program.id).p("name").record(name)]);
  }

  export function setNextDay(dispatch: IDispatch, program: IProgram, nextDay: number): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("programs").findBy("id", program.id).p("nextDay").record(nextDay),
    ]);
  }

  export function setIsMultiweek(dispatch: IDispatch, program: IProgram, value: boolean): void {
    updateState(
      dispatch,
      EditProgramLenses.setIsMultiweek(lb<IState>().p("storage").p("programs").findBy("id", program.id), value)
    );
  }

  export function reorderSets(
    dispatch: IDispatch,
    variationIndex: number,
    startSetIndex: number,
    endSetIndex: number
  ): void {
    updateState(dispatch, [
      EditProgramLenses.reorderSets(lb<IState>().pi("editExercise"), variationIndex, startSetIndex, endSetIndex),
    ]);
  }

  export function setDayName(dispatch: IDispatch, program: IProgram, dayIndex: number, name: string): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("programs").findBy("id", program.id).p("days").i(dayIndex).p("name").record(name),
    ]);
  }

  export function setWeekName(dispatch: IDispatch, programId: string, weekIndex: number, name: string): void {
    updateState(dispatch, [
      EditProgramLenses.setWeekName(lb<IState>().p("storage").p("programs").findBy("id", programId), weekIndex, name),
    ]);
  }

  export function addSet(dispatch: IDispatch, variationIndex: number): void {
    updateState(dispatch, [EditProgramLenses.addSet(lb<IState>().pi("editExercise"), variationIndex)]);
  }

  export function removeSet(dispatch: IDispatch, variationIndex: number, setIndex: number): void {
    updateState(dispatch, [EditProgramLenses.removeSet(lb<IState>().pi("editExercise"), variationIndex, setIndex)]);
  }

  export function addProgramExercise(dispatch: IDispatch, units: IUnit): void {
    updateState(dispatch, [
      lb<IState>().p("editExercise").record(Program.createExercise(units)),
      lb<IState>()
        .p("screenStack")
        .recordModify((stack) => Screen.push(stack, "editProgramExercise")),
    ]);
  }

  export function editProgramExercise(dispatch: IDispatch, exercise: IProgramExercise): void {
    updateState(dispatch, [
      lb<IState>().p("editExercise").record(exercise),
      lb<IState>()
        .p("screenStack")
        .recordModify((stack) => Screen.push(stack, "editProgramExercise")),
    ]);
  }

  export function removeProgramExercise(dispatch: IDispatch, program: IProgram, exerciseId: string): void {
    updateState(
      dispatch,
      EditProgramLenses.removeProgramExercise(
        lb<IState>().p("storage").p("programs").findBy("id", program.id),
        exerciseId
      )
    );
  }

  export function copyProgramExercise(dispatch: IDispatch, program: IProgram, exercise: IProgramExercise): void {
    updateState(
      dispatch,
      EditProgramLenses.copyProgramExercise(lb<IState>().p("storage").p("programs").findBy("id", program.id), exercise)
    );
  }

  export function toggleDayExercise(
    dispatch: IDispatch,
    program: IProgram,
    dayIndex: number,
    exerciseId: string
  ): void {
    updateState(dispatch, [
      EditProgramLenses.toggleDayExercise(
        lb<IState>().p("storage").p("programs").findBy("id", program.id),
        dayIndex,
        exerciseId
      ),
    ]);
  }

  export function addWeekDay(dispatch: IDispatch, programId: string, weekIndex: number, dayId: string): void {
    updateState(dispatch, [
      EditProgramLenses.addWeekDay(lb<IState>().p("storage").p("programs").findBy("id", programId), weekIndex, dayId),
    ]);
  }

  export function removeWeekDay(dispatch: IDispatch, programId: string, weekIndex: number, dayIndex: number): void {
    updateState(dispatch, [
      EditProgramLenses.removeWeekDay(
        lb<IState>().p("storage").p("programs").findBy("id", programId),
        weekIndex,
        dayIndex
      ),
    ]);
  }

  export function reorderDays(
    dispatch: IDispatch,
    programIndex: number,
    startDayIndex: number,
    endDayIndex: number
  ): void {
    updateState(dispatch, [
      EditProgramLenses.reorderDays(
        lb<IState>().p("storage").p("programs").i(programIndex),
        startDayIndex,
        endDayIndex
      ),
    ]);
  }

  export function reorderDaysWithinWeek(
    dispatch: IDispatch,
    programId: string,
    weekIndex: number,
    startDayIndex: number,
    endDayIndex: number
  ): void {
    updateState(dispatch, [
      EditProgramLenses.reorderDaysWithinWeek(
        lb<IState>().p("storage").p("programs").findBy("id", programId),
        weekIndex,
        startDayIndex,
        endDayIndex
      ),
    ]);
  }

  export function deleteDay(dispatch: IDispatch, programId: string, dayId: string): void {
    updateState(
      dispatch,
      EditProgramLenses.deleteDay(lb<IState>().p("storage").p("programs").findBy("id", programId), dayId)
    );
  }

  export function reorderWeeks(
    dispatch: IDispatch,
    programIndex: number,
    startWeekIndex: number,
    endWeekIndex: number
  ): void {
    updateState(dispatch, [
      EditProgramLenses.reorderWeeks(
        lb<IState>().p("storage").p("programs").i(programIndex),
        startWeekIndex,
        endWeekIndex
      ),
    ]);
  }

  export function createWeek(dispatch: IDispatch, programIndex: number): void {
    const lensGetters = {
      editProgram: lb<IState>().p("storage").p("programs").i(programIndex).get(),
    };
    updateState(dispatch, [
      EditProgramLenses.createWeek(lb<IState>().p("storage").p("programs").i(programIndex)),
      lbu<IState, typeof lensGetters>(lensGetters)
        .pi("editProgram")
        .recordModify((editProgram, getters) => {
          return { ...editProgram, weekIndex: getters.editProgram.weeks.length - 1 };
        }),
      lb<IState>()
        .p("screenStack")
        .recordModify((screenStack) => Screen.push(screenStack, "editProgramWeek")),
    ]);
  }

  export function reorderExercises(
    dispatch: IDispatch,
    program: IProgram,
    dayIndex: number,
    startExerciseIndex: number,
    endExerciseIndex: number
  ): void {
    updateState(dispatch, [
      EditProgramLenses.reorderExercises(
        lb<IState>().p("storage").p("programs").findBy("id", program.id),
        dayIndex,
        startExerciseIndex,
        endExerciseIndex
      ),
    ]);
  }

  export function saveExercise(dispatch: IDispatch, programIndex: number): void {
    const exerciseLensGetters = {
      editExercise: lb<IState>().p("editExercise").get(),
      state: lb<IState>().get(),
    };
    updateState(
      dispatch,
      [
        lbu<IState, typeof exerciseLensGetters>(exerciseLensGetters)
          .p("storage")
          .p("programs")
          .i(programIndex)
          .p("exercises")
          .recordModify((exc, getters) => {
            const editExercise = getters.editExercise!;
            const exercise = exc.find((e) => e.id === editExercise.id);
            if (exercise != null) {
              return exc.map((e) => (e.id === editExercise.id ? editExercise : e));
            } else {
              return [...exc, editExercise];
            }
          }),
        lbu<IState, typeof exerciseLensGetters>(exerciseLensGetters)
          .p("storage")
          .p("programs")
          .recordModify((programs, getters) => {
            if (getters.state.screenStack[getters.state.screenStack.length - 2] === "editProgramDay") {
              const dayIndex = getters.state.editProgram!.dayIndex!;
              const exerciseId = getters.editExercise!.id;
              return lf(programs)
                .i(programIndex)
                .p("days")
                .i(dayIndex)
                .p("exercises")
                .modify((es) => {
                  if (es.every((e) => e.id !== exerciseId)) {
                    return [...es, { id: exerciseId }];
                  } else {
                    return es;
                  }
                });
            } else {
              return programs;
            }
          }),
        lb<IState>()
          .p("screenStack")
          .recordModify((s) => Screen.pull(s)),
        lb<IState>().p("editExercise").record(undefined),
      ],
      "Save Exercise"
    );
  }

  export function applyProgramExerciseExample(dispatch: IDispatch, example: IProgramExerciseExample): void {
    updateState(dispatch, [EditProgramLenses.applyProgramExerciseExample(lb<IState>().pi("editExercise"), example)]);
  }

  export function set531Tms(dispatch: IDispatch, programIndex: number, tms: I531Tms): void {
    updateState(
      dispatch,
      ObjectUtils.keys(tms).map((exerciseId) => {
        return lb<IState>()
          .p("storage")
          .p("programs")
          .i(programIndex)
          .p("exercises")
          .find((e) => e.exerciseType.id === exerciseId)
          .p("state")
          .p("tm")
          .record(tms[exerciseId]);
      })
    );
  }

  export function updateSimpleExercise(
    dispatch: IDispatch,
    units: IUnit,
    sets?: number,
    reps?: number,
    weight?: number
  ): void {
    if (sets != null && reps != null && weight != null) {
      updateState(
        dispatch,
        EditProgramLenses.updateSimpleExercise(lb<IState>().pi("editExercise"), units, sets, reps, weight)
      );
    }
  }

  export function setProgression(
    dispatch: IDispatch,
    progression?: { increment: number; unit: IUnit | "%"; attempts: number },
    deload?: { decrement: number; unit: IUnit | "%"; attempts: number }
  ): void {
    updateState(
      dispatch,
      EditProgramLenses.setProgression(lb<IState>().pi("editExercise"), progression, deload),
      "Setting Progression or Deload in simple exercise"
    );
  }

  export function setDefaultWarmupSets(dispatch: IDispatch, exercise: IExercise, unit: IUnit): void {
    updateState(dispatch, [EditProgramLenses.setDefaultWarmupSets(lb<IState>().pi("editExercise"), exercise, unit)]);
  }

  export function addWarmupSet(dispatch: IDispatch, ws: IProgramExerciseWarmupSet[], unit: IUnit): void {
    updateState(dispatch, [EditProgramLenses.addWarmupSet(lb<IState>().pi("editExercise"), ws, unit)]);
  }

  export function removeWarmupSet(dispatch: IDispatch, warmupSets: IProgramExerciseWarmupSet[], index: number): void {
    updateState(dispatch, [EditProgramLenses.removeWarmupSet(lb<IState>().pi("editExercise"), warmupSets, index)]);
  }

  export function updateWarmupSet(
    dispatch: IDispatch,
    warmupSets: IProgramExerciseWarmupSet[],
    index: number,
    newWarmupSet: IProgramExerciseWarmupSet
  ): void {
    updateState(dispatch, [
      EditProgramLenses.updateWarmupSet(lb<IState>().pi("editExercise"), warmupSets, index, newWarmupSet),
    ]);
  }

  export function reuseLogic(dispatch: IDispatch, allProgramExercises: IProgramExercise[], id: string): void {
    updateState(dispatch, [EditProgramLenses.reuseLogic(lb<IState>().pi("editExercise"), allProgramExercises, id)]);
  }

  export function initializePlanner(
    dispatch: IDispatch,
    plannerProgram: IPlannerProgram,
    settings: ISettings,
    focusedDay?: IDayData
  ): void {
    const initialSettings: IPlannerSettings = {
      strengthSetsPct: 30,
      hypertrophySetsPct: 70,
      weeklyRangeSets: {
        shoulders: [10, 12],
        triceps: [10, 12],
        back: [10, 12],
        abs: [10, 12],
        glutes: [10, 12],
        hamstrings: [10, 12],
        quadriceps: [10, 12],
        chest: [10, 12],
        biceps: [10, 12],
        calves: [10, 12],
        forearms: [10, 12],
      },
      weeklyFrequency: {
        shoulders: 2,
        triceps: 2,
        back: 2,
        abs: 2,
        glutes: 2,
        hamstrings: 2,
        quadriceps: 2,
        chest: 2,
        biceps: 2,
        calves: 2,
        forearms: 2,
      },
      synergistMultiplier: 0.5,
      restTimer: settings.timers.workout ?? 180,
      customEquipment: settings.equipment,
      customExercises: settings.exercises,
      unit: settings.units,
    };

    const initialState: IPlannerState = {
      settings: initialSettings,
      current: { program: plannerProgram },
      ui: { weekIndex: 0, focusedDay },
      history: { past: [], future: [] },
    };

    updateState(dispatch, [lb<IState>().p("editProgramV2").record(initialState)]);
  }

  export function createExperimental(dispatch: IDispatch, name: string, settings: ISettings): void {
    const newProgram: IProgram = {
      id: UidFactory.generateUid(8),
      name,
      url: "",
      author: "",
      shortDescription: "",
      description: "",
      nextDay: 1,
      weeks: [],
      isMultiweek: false,
      days: [{ name: "Day 1", id: UidFactory.generateUid(8), exercises: [] }],
      exercises: [],
      tags: [],
      deletedDays: [],
      deletedWeeks: [],
      deletedExercises: [],
      clonedAt: Date.now(),
      planner: {
        name,
        weeks: [{ name: "Week 1", days: [{ name: "Day 1", exerciseText: "" }] }],
      },
    };

    initializePlanner(dispatch, newProgram.planner!, settings);
    updateState(dispatch, [
      lb<IState>()
        .p("storage")
        .p("programs")
        .recordModify((pgms) => [...pgms, newProgram]),
      lb<IState>().p("storage").p("currentProgramId").record(newProgram.id),
      lb<IState>()
        .p("screenStack")
        .recordModify((stack) => Screen.push(stack, "editProgram")),
      lb<IState>().p("editProgram").record({ id: newProgram.id }),
    ]);
  }
}
