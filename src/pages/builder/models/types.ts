import { IExerciseType, IWeight } from "../../../types";
import { IScreenMuscle } from "../../../models/muscle";

export interface IBuilderSet {
  reps: number;
  weightPercentage: number;
  isAmrap?: boolean;
}

export interface IBuilderExercise {
  exerciseType: IExerciseType;
  sets: IBuilderSet[];
  restTimer: number;
  isSuperset: boolean;
  onerm: IWeight;
}

export interface IBuilderDay {
  name: string;
  exercises: IBuilderExercise[];
}

export interface IBuilderWeek {
  name: string;
  days: IBuilderDay[];
}

export interface IBuilderProgram {
  name: string;
  weeks: IBuilderWeek[];
}

export interface IBuilderModalExercise {
  weekIndex: number;
  dayIndex: number;
  exerciseIndex: number;
}

export interface IBuilderModalSubstitute {
  exerciseType: IExerciseType;
  weekIndex: number;
  dayIndex: number;
  exerciseIndex: number;
}

export interface IBuilderModalExercisesByMuscle {
  muscle: IScreenMuscle;
  weekIndex: number;
}

export interface ISelectedExercise {
  weekIndex: number;
  dayIndex?: number;
  exerciseIndex?: number;
}

export interface IBuilderUI {
  modalExercise?: IBuilderModalExercise;
  modalExercisesByMuscle?: IBuilderModalExercisesByMuscle;
  modalSubstitute?: IBuilderModalSubstitute;
  selectedExercise?: ISelectedExercise;
}
