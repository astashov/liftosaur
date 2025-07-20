import { h, JSX } from "preact";
import { BottomSheet } from "../bottomSheet";
import { IEvaluatedProgram } from "../../models/program";
import { IExercisePickerState, ISettings } from "../../types";
import { ExercisePickerMain } from "./exercisePickerMain";
import { ExercisePickerFilter } from "./exercisePickerFilter";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";

interface IProps {
  isHidden: boolean;
  settings: ISettings;
  exercisePicker: IExercisePickerState;
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
        isHidden={props.isHidden}
        state={state}
        settings={props.settings}
        evaluatedProgram={evaluatedProgram}
        onClose={props.onClose}
      />
    );
  } else if (currentScreen === "filter") {
    content = (
      <ExercisePickerFilter
        settings={props.settings}
        onPullScreen={() => {
          props.dispatch(
            lb<IExercisePickerState>()
              .p("screenStack")
              .recordModify((stack) => stack.slice(0, -1)),
            "Pop screen in exercise picker screen stack"
          );
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
