import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { IProgram, ISettings } from "../types";
import { Program } from "../models/program";
import { HistoryRecordView } from "./historyRecord";
import { IDispatch } from "../ducks/types";

interface IProps {
  isHidden: boolean;
  currentProgram?: IProgram;
  settings: ISettings;
  dispatch: IDispatch;
  onClose: () => void;
}

export function BottomSheetNextWorkout(props: IProps): JSX.Element {
  const programDay = props.currentProgram
    ? Program.getProgramDay(props.currentProgram, props.currentProgram.nextDay)
    : undefined;
  const nextHistoryRecord = props.currentProgram
    ? Program.nextProgramRecord(props.currentProgram, props.settings)
    : undefined;
  return (
    <BottomSheet shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
      <h3 className="pt-3 pb-4 text-lg font-semibold text-center">New Workout</h3>
      {programDay && nextHistoryRecord && (
        <HistoryRecordView
          historyRecord={nextHistoryRecord}
          programDay={programDay}
          isOngoing={false}
          settings={props.settings}
          dispatch={props.dispatch}
        />
      )}
    </BottomSheet>
  );
}
