import { h, JSX } from "preact";
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
import { ExercisePickerCustomExercise2 } from "./exercisePickerCustomExercise2";

interface IProps {
  isHidden: boolean;
  isLoggedIn: boolean;
  settings: ISettings;
  exercisePicker: IExercisePickerState;
  usedExerciseTypes: IExerciseType[];
  onStar: (key: string) => void;
  onChangeSettings: (settings: IExercisePickerSettings) => void;
  onChangeCustomExercise: (action: "upsert" | "delete", exercise: ICustomExercise, notes?: string) => void;
  onChoose: (selectedExercises: IExercisePickerSelectedExercise[]) => void;
  dispatch: ILensDispatch<IExercisePickerState>;
  evaluatedProgram?: IEvaluatedProgram;
  onClose: () => void;
}

export function BottomSheetExercisePicker(props: IProps): JSX.Element {
  const { evaluatedProgram } = props;
  let content: JSX.Element | undefined;
  const state = props.exercisePicker;
  const currentScreen = state.screenStack[state.screenStack.length - 1] ?? "exercisePicker";
  if (currentScreen === "exercisePicker") {
    content = (
      <ExercisePickerMain
        dispatch={props.dispatch}
        onStar={props.onStar}
        isHidden={props.isHidden}
        usedExerciseTypes={props.usedExerciseTypes}
        onChoose={props.onChoose}
        state={state}
        settings={props.settings}
        evaluatedProgram={evaluatedProgram}
        onClose={props.onClose}
      />
    );
  } else if (currentScreen === "settings") {
    content = (
      <ExercisePickerSettings onChange={props.onChangeSettings} settings={props.settings} dispatch={props.dispatch} />
    );
  } else if (currentScreen === "filter") {
    content = <ExercisePickerFilter state={state} settings={props.settings} dispatch={props.dispatch} />;
  } else if (currentScreen === "customExercise" && state.editCustomExercise != null) {
    const originalExercise = props.settings.exercises[state.editCustomExercise.id];
    content = (
      <ExercisePickerCustomExercise2
        screenStack={state.screenStack}
        settings={props.settings}
        isLoggedIn={props.isLoggedIn}
        dispatch={props.dispatch}
        originalExercise={originalExercise}
        exercise={state.editCustomExercise}
        onClose={props.onClose}
        onChange={(action, exercise, notes) => {
          props.onChangeCustomExercise(action, exercise, notes);
        }}
      />
    );
  }
  return (
    <BottomSheet isHidden={props.isHidden} onClose={props.onClose}>
      {content}
    </BottomSheet>
  );
}
