import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { BottomSheet } from "./bottomSheet";
import { IconEditSquare } from "./icons/iconEditSquare";
import { BottomSheetItem } from "./bottomSheetItem";
import { IconHelp } from "./icons/iconHelp";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { IHistoryRecord } from "../types";

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
          title="Information"
          name="information"
          icon={<IconHelp />}
          description="Quick reminder how to do the exercise. If you don't know how to do it at all, better find some youtube videos that explain the proper form"
          onClick={() => {
            updateState(props.dispatch, [
              lb<IState>().p("progress").pi(props.progress.id).pi("ui").p("entryIndexInfoMode").record(entryIndex),
              lb<IState>().p("progress").pi(props.progress.id).pi("ui").p("exerciseBottomSheet").record(undefined),
            ]);
          }}
        />
      </div>
    </BottomSheet>
  );
}
