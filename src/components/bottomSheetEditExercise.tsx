import React, { JSX } from "react";
import { View, TouchableOpacity } from "react-native";
import { IDispatch } from "../ducks/types";
import { BottomSheet } from "./bottomSheet";
import { IconEditSquare } from "./icons/iconEditSquare";
import { BottomSheetItem } from "./bottomSheetItem";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { IHistoryRecord } from "../types";
import { Thunk } from "../ducks/thunks";
import { IconStats } from "./icons/iconStats";
import { IconEdit } from "./icons/iconEdit";
import { LftText } from "./lftText";

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
      <View className="p-4">
        <BottomSheetItem
          name="edit-exercise"
          title="Edit Exercise"
          isFirst={true}
          icon={<IconEdit penColor="#607284" lineColor="#607284" size={18} />}
          description={
            <LftText>
              Edit <LftText className="font-bold">only for this workout</LftText>, it will not change it in the program.
              To change it in the program, press <IconEditSquare className="inline-block mx-1" /> at the top of the
              screen to edit the program, and edit exercise there.
            </LftText>
          }
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
          description={
            <LftText>
              Various stats about this exercise. Your progress graphs, your personal records, exercise history.
            </LftText>
          }
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
      </View>
    </BottomSheet>
  );
}
