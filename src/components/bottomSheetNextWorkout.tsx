import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IProgram, ISettings, IStats } from "../types";
import {
  emptyProgramId,
  Program_evaluate,
  Program_getProgramDay,
  Program_nextHistoryRecord,
  Program_isEmpty,
} from "../models/program";
import { HistoryRecordView } from "./historyRecord";
import { IDispatch } from "../ducks/types";
import { LinkButton } from "./linkButton";
import { IconSwap } from "./icons/iconSwap";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { IconPlus2 } from "./icons/iconPlus2";
import { Thunk_startProgramDay } from "../ducks/thunks";
import { navigationRef } from "../navigation/navigationRef";

export interface IBottomSheetNextWorkoutContentProps {
  currentProgram?: IProgram;
  allPrograms: IProgram[];
  settings: ISettings;
  stats: IStats;
  dispatch: IDispatch;
  onClose: () => void;
}

export function BottomSheetNextWorkoutContent(props: IBottomSheetNextWorkoutContentProps): JSX.Element {
  const evaluatedProgram = props.currentProgram ? Program_evaluate(props.currentProgram, props.settings) : undefined;

  const programDay = evaluatedProgram ? Program_getProgramDay(evaluatedProgram, evaluatedProgram.nextDay) : undefined;
  const nextHistoryRecord = props.currentProgram
    ? Program_nextHistoryRecord(props.currentProgram, props.settings, props.stats)
    : undefined;

  const doesProgressNotMatchProgram =
    nextHistoryRecord &&
    (nextHistoryRecord.programId !== props.currentProgram?.id ||
      nextHistoryRecord.day !== props.currentProgram.nextDay);

  return (
    <View>
      <Text className="pt-3 pb-4 text-lg font-semibold text-center">New Workout</Text>
      {doesProgressNotMatchProgram && (
        <Text className="mx-4 mb-1 text-xs text-center text-text-secondary">
          You currently have ongoing workout. Finish it first to see newly chosen program or a different day.
        </Text>
      )}
      {Program_isEmpty(props.currentProgram) && (
        <Text className="mx-4 mb-1 text-xs text-center text-text-secondary">No program currently selected.</Text>
      )}
      {programDay && nextHistoryRecord && (
        <HistoryRecordView
          historyRecord={nextHistoryRecord}
          programDay={programDay}
          isOngoing={false}
          settings={props.settings}
          dispatch={props.dispatch}
        />
      )}
      <View className="flex-row justify-between px-4 pb-4 bg-background-default">
        <LinkButton
          name="change-next-day"
          data-cy="change-next-day" data-testid="change-next-day" testID="change-next-day"
          onClick={() => navigationRef.navigate("changeNextDayModal")}
        >
          <View className="flex-row items-center">
            <IconSwap color={Tailwind_colors().blue[400]} size={16} />
            <Text className="pl-1 text-sm font-bold underline text-text-link">Change next workout</Text>
          </View>
        </LinkButton>
        <LinkButton
          name="start-empty-workout"
          data-cy="start-empty-workout" data-testid="start-empty-workout" testID="start-empty-workout"
          onClick={() => {
            props.dispatch(Thunk_startProgramDay(emptyProgramId));
          }}
        >
          <View className="flex-row items-center">
            <IconPlus2 color={Tailwind_colors().blue[400]} size={16} />
            <Text className="pl-1 text-sm font-bold underline text-text-link">Ad-Hoc Workout</Text>
          </View>
        </LinkButton>
      </View>
    </View>
  );
}
