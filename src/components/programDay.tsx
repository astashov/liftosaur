import { h, JSX } from "preact";
import { CardsView } from "./cards";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { IWebpushr, ISettings } from "../ducks/reducer";
import { Program, IProgramId } from "../models/program";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord } from "../models/history";
import { IStats } from "../models/stats";
import { ModalAmrap } from "./modalAmrap";
import { DateUtils } from "../utils/date";
import { ModalWeight } from "./modalWeight";
import { useState } from "preact/hooks";
import { Timer } from "./timer";
import { IProgressMode, IProgress } from "../models/progress";
import { ModalDate } from "./modalDate";

interface IProps {
  programId: IProgramId;
  progress: IProgress;
  history: IHistoryRecord[];
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
  webpushr?: IWebpushr;
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.progress;
  const historyRecord = progress.historyRecord;
  const [timerStart, setTimerStart] = useState<number | undefined>(undefined);
  const [timerMode, setTimerMode] = useState<IProgressMode | undefined>(undefined);

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
              setTimerMode(mode);
              setTimerStart(new Date().getTime());
            }
          }}
        />
        <section className="relative">
          <Timer
            mode={timerMode ?? "workout"}
            timerStart={timerStart}
            webpushr={props.webpushr}
            timers={props.settings.timers}
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
