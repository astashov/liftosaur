import type { JSX } from "react";
import { ISettings, ICustomExercise } from "../types";
import { BottomSheet } from "./bottomSheet";
import { ExercisePickerCustomExercise } from "./exercisePicker/exercisePickerCustomExercise";
import { IDispatch } from "../ducks/types";
import { useLensReducer } from "../utils/useLensReducer";

interface IProps {
  isHidden: boolean;
  isLoggedIn: boolean;
  settings: ISettings;
  exercise: ICustomExercise;
  dispatch: IDispatch;
  onChange: (action: "upsert" | "delete", exercise: ICustomExercise, notes?: string) => void;
  onClose: () => void;
}

export type IBottomSheetCustomExerciseContentProps = Omit<IProps, "isHidden">;

export function BottomSheetCustomExerciseContent(props: IBottomSheetCustomExerciseContentProps): JSX.Element {
  const [state, dispatch] = useLensReducer(props.exercise, {}, []);
  return (
    <ExercisePickerCustomExercise
      screenStack={[]}
      settings={props.settings}
      showMuscles={true}
      isLoggedIn={props.isLoggedIn}
      dispatch={dispatch}
      originalExercise={props.exercise}
      exercise={state}
      onClose={props.onClose}
      onChange={(action, exercise, notes) => {
        props.onChange(action, exercise, notes);
      }}
      onGoBack={() => {
        props.onClose();
      }}
    />
  );
}

export function BottomSheetCustomExercise(props: IProps): JSX.Element {
  return (
    <BottomSheet isHidden={props.isHidden} onClose={props.onClose}>
      <BottomSheetCustomExerciseContent
        settings={props.settings}
        isLoggedIn={props.isLoggedIn}
        exercise={props.exercise}
        dispatch={props.dispatch}
        onChange={props.onChange}
        onClose={props.onClose}
      />
    </BottomSheet>
  );
}
