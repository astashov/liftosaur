import type { JSX } from "react";
import { Modal } from "./modal";
import { Text } from "./primitives/text";
import { IProgram, ISettings, IStats } from "../types";
import { NextDayPicker } from "./nextDayPicker";
import { View } from "react-native";

interface IModalProgramNextDayProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  stats: IStats;
  settings: ISettings;
  onSelect: (programId: string, day: number) => void;
  onClose: () => void;
}

export function ModalProgramNextDayContent(props: IModalProgramNextDayProps): JSX.Element {
  return (
    <>
      <View className="mt-4 mb-1 text-center">
        <Text className="text-lg font-semibold text-center">Change Next Day</Text>
      </View>
      <NextDayPicker
        stats={props.stats}
        initialCurrentProgramId={props.initialCurrentProgramId}
        allPrograms={props.allPrograms}
        settings={props.settings}
        onSelect={(programId, day) => {
          props.onSelect(programId, day);
          props.onClose();
        }}
      />
    </>
  );
}

export function ModalProgramNextDay(props: IModalProgramNextDayProps): JSX.Element {
  return (
    <Modal noPaddings shouldShowClose onClose={props.onClose} isFullWidth>
      <ModalProgramNextDayContent {...props} />
    </Modal>
  );
}
