import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IHistoryRecord, IProgram, ISettings, IStats } from "../types";
import { NextDayPicker } from "./nextDayPicker";
import { LinkButton } from "./linkButton";
import { IDispatch } from "../ducks/types";
import { EditProgram_updateProgram } from "../models/editProgram";
import { Program_addDayFromHistoryRecord } from "../models/program";
import { CollectionUtils_findBy } from "../utils/collection";
import { Dialog_alert } from "../utils/dialog";

interface IModalDayFromAdhocContentProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  settings: ISettings;
  stats: IStats;
  record: IHistoryRecord;
  dispatch: IDispatch;
  onCreateProgram: () => void;
  onClose: () => void;
}

export function ModalDayFromAdhocContent(props: IModalDayFromAdhocContentProps): JSX.Element {
  return (
    <>
      <View className="justify-center pb-2">
        <LinkButton
          name="create-program-from-adhoc"
          data-testid="create-program-from-adhoc"
          testID="create-program-from-adhoc"
          className="text-sm text-center"
          onClick={props.onCreateProgram}
        >
          Create a new program with this workout
        </LinkButton>
      </View>
      <View className="items-center justify-center mx-4 mb-1">
        <Text className="text-sm">or select day to add after in the existing program:</Text>
      </View>
      <NextDayPicker
        initialCurrentProgramId={props.initialCurrentProgramId}
        stats={props.stats}
        allPrograms={props.allPrograms}
        settings={props.settings}
        onSelect={(programId, day) => {
          const program = CollectionUtils_findBy(props.allPrograms, "id", programId);
          if (program != null) {
            try {
              const { program: newProgram, dayData } = Program_addDayFromHistoryRecord(
                program,
                day,
                props.record,
                props.settings
              );
              EditProgram_updateProgram(props.dispatch, newProgram);
              let position =
                (newProgram.planner?.weeks.length ?? 0) > 1
                  ? `${newProgram.planner?.weeks[dayData.week - 1].name}, `
                  : "";
              position += newProgram.planner?.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1]?.name;
              Dialog_alert(`Added to program '${newProgram.name}', at ${position}`);
            } catch (e) {
              Dialog_alert(`Error adding day to program: ${e instanceof Error ? e.message : e}`);
            }
          }
          props.onClose();
        }}
      />
    </>
  );
}
