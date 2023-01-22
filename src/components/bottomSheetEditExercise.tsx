import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { BottomSheet } from "./bottomSheet";
import { IconEditSquare } from "./icons/iconEditSquare";
import { BottomSheetItem } from "./bottomSheetItem";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { IHistoryRecord } from "../types";
import { Thunk } from "../ducks/thunks";
import { IconStats } from "./icons/iconStats";

interface IProps {
  progress: IHistoryRecord;
  isHidden: boolean;
  dispatch: IDispatch;
}

export function BottomSheetEditExercise(props: IProps): JSX.Element {
  const entryIndex = props.progress.ui?.exerciseBottomSheet?.entryIndex;
  return (
    <BottomSheet
      isHidden={props.isHidden}
      onClose={() => {
        updateState(props.dispatch, [
          lb<IState>().p("progress").pi(props.progress.id).pi("ui").p("exerciseBottomSheet").record(undefined),
        ]);
      }}
    >
      <div className="p-4">
        <BottomSheetItem
          name="edit-exercise"
          title="Edit Exercise"
          isFirst={true}
          icon={<IconEditSquare />}
          description='Edit only for this workout, it will not change it in the program. To change it in the program, press "Edit Day" in the footer.'
          onClick={() =>
            updateState(props.dispatch, [
              lb<IState>().p("progress").pi(props.progress.id).pi("ui").p("entryIndexEditMode").record(entryIndex),
              lb<IState>().p("progress").pi(props.progress.id).pi("ui").p("exerciseBottomSheet").record(undefined),
            ])
          }
        />
        <BottomSheetItem
          title="Exercise Stats"
          name="exercise-stats"
          icon={<IconStats />}
          description="Various stats about this exercise. Your progress graphs, your personal records, exercise history."
          onClick={() => {
            if (entryIndex != null) {
              const entry = props.progress.entries[entryIndex];
              updateState(props.dispatch, [
                lb<IState>().p("progress").pi(props.progress.id).pi("ui").p("exerciseBottomSheet").record(undefined),
              ]);
              props.dispatch(Thunk.pushExerciseStatsScreen(entry.exercise));
            }
          }}
        />
      </div>
    </BottomSheet>
  );
}
