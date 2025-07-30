import { h, JSX } from "preact";
import { BottomSheet } from "../bottomSheet";
import { IEvaluatedProgram } from "../../models/program";
import { ICustomExercise, IExercisePickerSelectedExercise, IExercisePickerState, ISettings } from "../../types";
import { ExercisePickerMain } from "./exercisePickerMain";
import { ExercisePickerFilter } from "./exercisePickerFilter";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ExercisePickerCustomExercise } from "./exercisePickerCustomExercise";

interface IProps {
  isHidden: boolean;
  settings: ISettings;
  exercisePicker: IExercisePickerState;
  onStar: (key: string) => void;
  onChangeCustomExercise: (action: "upsert" | "delete", exercise: ICustomExercise) => void;
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
        onChoose={props.onChoose}
        state={state}
        settings={props.settings}
        evaluatedProgram={evaluatedProgram}
        onClose={props.onClose}
      />
    );
  } else if (currentScreen === "filter") {
    content = <ExercisePickerFilter state={state} settings={props.settings} dispatch={props.dispatch} />;
  } else if (currentScreen === "customExercise") {
    content = (
      <ExercisePickerCustomExercise
        settings={props.settings}
        dispatch={props.dispatch}
        exercise={state.editCustomExercise}
        onChange={(exercise, action) => {
          props.onChangeCustomExercise(exercise, action);
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
