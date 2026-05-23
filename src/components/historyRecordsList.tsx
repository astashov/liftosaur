import { JSX, Fragment } from "react";
import { IDispatch } from "../ducks/types";
import { IPersonalRecords } from "../models/history";
import { IHistoryRecord, IProgram, ISettings, ISubscription } from "../types";
import { HistoryRecordView } from "./historyRecord";
import { Program_evaluate, Program_getProgramDay } from "../models/program";
import { View } from "react-native";

interface IHistoryRecordsListProps {
  history: IHistoryRecord[];
  program: IProgram;
  isOngoing: boolean;
  prs: IPersonalRecords;
  settings: ISettings;
  firstDayOfWeeks: number[];
  dispatch: IDispatch;
  subscription: ISubscription;
}

export function HistoryRecordsList(props: IHistoryRecordsListProps): JSX.Element {
  const { history, settings, dispatch } = props;
  const program = Program_evaluate(props.program, props.settings);
  const programDay = Program_getProgramDay(program, program.nextDay);
  return (
    <Fragment>
      {history.map((record) => {
        return (
          <View className="mx-4 mb-6" key={record.id}>
            <HistoryRecordView
              isOngoing={props.isOngoing}
              showTitle={true}
              programDay={programDay}
              prs={props.prs}
              settings={settings}
              historyRecord={record}
              dispatch={dispatch}
            />
          </View>
        );
      })}
    </Fragment>
  );
}
