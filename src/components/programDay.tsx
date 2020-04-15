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
      <section className="flex flex-col h-full relative">
        <HeaderView
          title={DateUtils.format(historyRecord?.date != null ? historyRecord.date : new Date())}
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
      </section>
    );
  } else {
    return null;
  }
}
