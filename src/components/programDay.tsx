import { h, JSX } from "preact";
import { CardsView } from "./cards";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { IWebpushr } from "../ducks/reducer";
import { Program, IProgramId } from "../models/program";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord } from "../models/history";
import { IStats } from "../models/stats";
import { ModalAmrap } from "./modalAmrap";
import { DateUtils } from "../utils/date";
import { ModalWeight } from "./modalWeight";
import { Timer } from "./timer";
import { IProgress, IProgressMode } from "../models/progress";
import { ModalDate } from "./modalDate";
import { ISettings } from "../models/settings";

interface IProps {
  programId: IProgramId;
  progress: IProgress;
  history: IHistoryRecord[];
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
  timerSince?: number;
  timerMode?: IProgressMode;
  webpushr?: IWebpushr;
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.progress;
  const historyRecord = progress.historyRecord;
  const timers = props.settings.timers;

  if (progress != null) {
    const currentProgram = Program.get(historyRecord?.programId ?? props.programId);
    return (
      <section className="relative flex flex-col h-full">
        <HeaderView
          title={
            <button
              onClick={() => {
                const date = historyRecord?.date;
                if (date != null) {
                  props.dispatch({ type: "ChangeDate", date });
                }
              }}
            >
              {DateUtils.format(historyRecord?.date != null ? historyRecord.date : new Date())}
            </button>
          }
          subtitle={currentProgram.name}
          left={
            <button
              onClick={() => {
                if (confirm("Are you sure?")) {
                  props.dispatch({ type: "CancelProgress" });
                }
              }}
            >
              Cancel
            </button>
          }
          right={
            historyRecord?.date != null ? (
              <div className="px-3">
                <button
                  onClick={() => {
                    if (confirm("Are you sure?")) {
                      props.dispatch({ type: "DeleteProgress" });
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            ) : (
              undefined
            )
          }
        />
        <CardsView
          progress={progress}
          availablePlates={props.settings.plates}
          dispatch={props.dispatch}
          onChangeReps={mode => {
            if (progress.historyRecord == null) {
              props.dispatch({ type: "StartTimer", timestamp: new Date().getTime(), mode });
            }
          }}
        />
        <section className="relative">
          <Timer
            mode={props.timerMode ?? "workout"}
            timerStart={props.timerSince}
            webpushr={props.webpushr}
            timers={timers}
            dispatch={props.dispatch}
          />
          <FooterView dispatch={props.dispatch} />
        </section>
        {progress.ui.amrapModal != null ? <ModalAmrap dispatch={props.dispatch} /> : undefined}
        {progress.ui.weightModal != null ? (
          <ModalWeight dispatch={props.dispatch} weight={progress.ui.weightModal.weight} />
        ) : (
          undefined
        )}
        {progress.ui.dateModal != null ? (
          <ModalDate dispatch={props.dispatch} date={progress.ui.dateModal.date} />
        ) : (
          undefined
        )}
      </section>
    );
  } else {
    return null;
  }
}
