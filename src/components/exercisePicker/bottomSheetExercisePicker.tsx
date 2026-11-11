import type { JSX } from "react";
import { BottomSheet } from "../bottomSheet";
import { IEvaluatedProgram } from "../../models/program";
import {
  ICustomExercise,
  IExercisePickerSelectedExercise,
  IExercisePickerState,
  IExerciseType,
  ISettings,
} from "../../types";
import { ExercisePickerMain } from "./exercisePickerMain";
import { ExercisePickerFilter } from "./exercisePickerFilter";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ExercisePickerSettings, IExercisePickerSettings } from "./exercisePickerSettings";
import { ExercisePickerCustomExercise } from "./exercisePickerCustomExercise";
import { lb } from "lens-shmens";
import { buildCustomLensDispatch } from "../../ducks/types";
import { useAndroidBack } from "../../navigation/useAndroidBack";
import { ExercisePickerBack_canPop, ExercisePickerBack_pop } from "./exercisePickerBack";

interface IExercisePickerContentProps {
  isLoggedIn: boolean;
  useInlineModals?: boolean;
  settings: ISettings;
  exercisePicker: IExercisePickerState;
  usedExerciseTypes: IExerciseType[];
  programExerciseTypes?: IExerciseType[];
  onStar: (key: string) => void;
  onChangeSettings: (settings: IExercisePickerSettings) => void;
  onChangeCustomExercise: (action: "upsert" | "delete", exercise: ICustomExercise, notes?: string) => void;
  onChoose: (selectedExercises: IExercisePickerSelectedExercise[]) => void;
  dispatch: ILensDispatch<IExercisePickerState>;
  evaluatedProgram?: IEvaluatedProgram;
  onClose: () => void;
}

export function ExercisePickerContent(props: IExercisePickerContentProps): JSX.Element {
  const { evaluatedProgram } = props;
  const state = props.exercisePicker;
  const currentScreen = state.screenStack[state.screenStack.length - 1] ?? "exercisePicker";
  useAndroidBack(ExercisePickerBack_canPop(state), () => {
    props.dispatch(lb<IExercisePickerState>().record(ExercisePickerBack_pop(state)), "Android back in exercise picker");
  });
  if (currentScreen === "exercisePicker") {
    return (
      <ExercisePickerMain
        dispatch={props.dispatch}
        onStar={props.onStar}
        isHidden={false}
        usedExerciseTypes={props.usedExerciseTypes}
        programExerciseTypes={props.programExerciseTypes}
        onChoose={props.onChoose}
        state={state}
        settings={props.settings}
        evaluatedProgram={evaluatedProgram}
        onClose={props.onClose}
      />
    );
  } else if (currentScreen === "settings") {
    return (
      <ExercisePickerSettings onChange={props.onChangeSettings} settings={props.settings} dispatch={props.dispatch} />
    );
  } else if (currentScreen === "filter") {
    return (
      <ExercisePickerFilter
        state={state}
        settings={props.settings}
        dispatch={props.dispatch}
        onChangeSettings={props.onChangeSettings}
      />
    );
  } else if (currentScreen === "customExercise" && state.editCustomExercise != null) {
    const originalExercise = props.settings.exercises[state.editCustomExercise.id];
    return (
      <ExercisePickerCustomExercise
        screenStack={state.screenStack}
        useInlineModals={props.useInlineModals}
        settings={props.settings}
        showMuscles={!!state.showMuscles}
        isLoggedIn={props.isLoggedIn}
        dispatch={buildCustomLensDispatch(props.dispatch, lb<IExercisePickerState>().pi("editCustomExercise"))}
        originalExercise={originalExercise}
        exercise={state.editCustomExercise}
        onClose={props.onClose}
        onChange={(action, exercise, notes) => {
          props.onChangeCustomExercise(action, exercise, notes);
        }}
        onGoBack={(desc) => {
          if (ExercisePickerBack_canPop(state)) {
            props.dispatch(lb<IExercisePickerState>().record(ExercisePickerBack_pop(state)), desc);
          } else {
            props.onClose();
          }
        }}
      />
    );
  }
  return <></>;
}

interface IBottomSheetExercisePickerProps extends IExercisePickerContentProps {
  isHidden: boolean;
}

export function BottomSheetExercisePicker(props: IBottomSheetExercisePickerProps): JSX.Element {
  return (
    <BottomSheet isHidden={props.isHidden} onClose={props.onClose}>
      <ExercisePickerContent {...props} />
    </BottomSheet>
  );
}
