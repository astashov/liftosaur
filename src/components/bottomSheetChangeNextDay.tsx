import type { JSX } from "react";
import { View, ScrollView } from "react-native";
import { Text } from "./primitives/text";

import { IProgram, ISettings, IStats } from "../types";
import { NextDayPicker } from "./nextDayPicker";
import { LinkButton } from "./linkButton";
import { emptyProgramId } from "../models/program";
import { SheetDragHandle } from "../navigation/SheetScreenContainer";

interface IBottomSheetChangeNextDayContentProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  settings: ISettings;
  stats: IStats;
  onSelect: (programId: string, day: number) => void;
  onClose: () => void;
}

export function BottomSheetChangeNextDayContent(props: IBottomSheetChangeNextDayContentProps): JSX.Element {
  return (
    <View className="flex-1">
      <SheetDragHandle>
        <View collapsable={false}>
          <Text className="mt-4 mb-1 text-lg font-semibold text-center">Change Next Workout</Text>
          <View className="items-center">
            <LinkButton
              name="change-next-day-empty-program"
              className="mb-2 text-xs"
              onPress={() => {
                props.onSelect(emptyProgramId, 1);
                props.onClose();
              }}
            >
              Go without a program
            </LinkButton>
          </View>
        </View>
      </SheetDragHandle>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <NextDayPicker
          initialCurrentProgramId={props.initialCurrentProgramId}
          allPrograms={props.allPrograms}
          settings={props.settings}
          stats={props.stats}
          onSelect={(programId, day) => {
            props.onSelect(programId, day);
            props.onClose();
          }}
        />
      </ScrollView>
    </View>
  );
}
