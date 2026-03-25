import type { JSX } from "react";
import { View } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { IPersonalRecords } from "@shared/models/history";
import type { IHistoryRecord, IProgram, ISettings, ISubscription } from "@shared/types";
import { HistoryRecordView } from "./HistoryRecordView";
import { Program_evaluate, Program_getProgramDay } from "@shared/models/program";

interface IProps {
  history: IHistoryRecord[];
  program: IProgram;
  isOngoing: boolean;
  prs: IPersonalRecords;
  settings: ISettings;
  dispatch: IDispatch;
  subscription: ISubscription;
}

export function HistoryRecordsList(props: IProps): JSX.Element {
  const { history, settings, dispatch } = props;
  const program = Program_evaluate(props.program, props.settings);
  const programDay = Program_getProgramDay(program, program.nextDay);
  return (
    <View>
      {history.map((record) => (
        <HistoryRecordView
          key={record.id}
          isOngoing={props.isOngoing}
          showTitle={true}
          programDay={programDay}
          prs={props.prs}
          settings={settings}
          historyRecord={record}
          dispatch={dispatch}
        />
      ))}
    </View>
  );
}
