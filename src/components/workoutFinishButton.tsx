import { JSX, memo, MutableRefObject, useState } from "react";
import { View } from "react-native";
import type RB from "rollbar";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISettings } from "../types";
import { Button } from "./button";
import { IconSpinner } from "./icons/iconSpinner";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { Dialog_alert } from "../utils/dialog";
import { WorkoutFinish_run } from "../utils/workoutFinish";

declare let Rollbar: RB | undefined;

interface IWorkoutFinishButtonProps {
  progressRef: MutableRefObject<IHistoryRecord>;
  isCurrent: boolean;
  settings: ISettings;
  dispatch: IDispatch;
}

function WorkoutFinishButtonInner(props: IWorkoutFinishButtonProps): JSX.Element {
  const isCurrent = props.isCurrent;
  const [isFinishing, setIsFinishing] = useState(false);
  return (
    <Button
      name={isCurrent ? "finish-workout" : "save-history-record"}
      kind="purple"
      buttonSize="md"
      disabled={isFinishing}
      data-testid="finish-workout"
      testID="finish-workout"
      className={isCurrent ? "ls-finish-workout" : "ls-save-history-record"}
      onClick={() => {
        if (isFinishing) {
          return;
        }
        WorkoutFinish_run({
          progress: props.progressRef.current,
          settings: props.settings,
          dispatch: props.dispatch,
          isCurrent,
          setIsFinishing,
        }).catch((error) => {
          if (typeof Rollbar !== "undefined" && Rollbar != null) {
            Rollbar.error(error instanceof Error ? error : new Error(String(error)));
          }
          Dialog_alert("Something went wrong finishing your workout. Please try again.");
        });
      }}
    >
      {isFinishing ? (
        <View className="px-2">
          <IconSpinner width={20} height={20} color={Tailwind_colors().white} />
        </View>
      ) : isCurrent ? (
        "Finish"
      ) : (
        "Save"
      )}
    </Button>
  );
}

export const WorkoutFinishButton = memo(WorkoutFinishButtonInner);
