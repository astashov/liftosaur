import { h, JSX } from "preact";
import { CardsView } from "./cards";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { IWebpushr, IState } from "../ducks/reducer";
import { IProgram } from "../models/program";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord } from "../models/history";
import { Screen } from "../models/screen";
import { IStats } from "../models/stats";
import { ModalAmrap } from "./modalAmrap";
import { DateUtils } from "../utils/date";
import { ModalWeight } from "./modalWeight";
import { Timer } from "./timer";
import { IProgressMode, Progress } from "../models/progress";
import { ModalDate } from "./modalDate";
import { ISettings } from "../models/settings";
import { lb } from "../utils/lens";

interface IProps {
  programs: IProgram[];
  progress: IHistoryRecord;
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
  const timers = props.settings.timers;

  if (progress != null) {
    // TODO: What to do if program missing?
    const currentProgram = props.programs.find((p) => p.id === progress.programId)!;
    return (
      <section className="relative h-full">
        <HeaderView
          title={
            <button
              onClick={() => {
                if (!Progress.isCurrent(progress)) {
                  props.dispatch({ type: "ChangeDate", date: progress.date });
                }
              }}
            >
              {DateUtils.format(progress.date)}
            </button>
          }
          subtitle={currentProgram.name}
          left={
            <button
              onClick={() => {
                if (Progress.isCurrent(progress) || confirm("Are you sure?")) {
                  props.dispatch({ type: "CancelProgress" });
                }
              }}
            >
              {Progress.isCurrent(progress) ? "Back" : "Cancel"}
            </button>
          }
          right={
            <div className="px-3">
              <button
                onClick={() => {
                  if (confirm("Are you sure?")) {
                    props.dispatch({ type: "DeleteProgress" });
                  }
                }}
              >
                {Progress.isCurrent(progress) ? "Cancel" : "Delete"}
              </button>
            </div>
          }
        />
        <CardsView
          bars={props.settings.bars}
          progress={progress}
          isTimerShown={!!props.timerSince}
          availablePlates={props.settings.plates}
          dispatch={props.dispatch}
          onChangeReps={(mode) => {
            if (Progress.isCurrent(progress)) {
              props.dispatch({ type: "StartTimer", timestamp: new Date().getTime(), mode });
            }
          }}
        />
        <Timer
          mode={props.timerMode ?? "workout"}
          timerStart={props.timerSince}
          webpushr={props.webpushr}
          timers={timers}
          dispatch={props.dispatch}
        />
        <FooterView
          dispatch={props.dispatch}
          buttons={
            <button
              onClick={() => {
                props.dispatch({
                  type: "UpdateState",
                  lensRecording: [
                    lb<IState>().p("editProgram").record({ id: currentProgram.id }),
                    lb<IState>()
                      .p("screenStack")
                      .recordModify((s) => Screen.push(s, "editProgram")),
                  ],
                });
              }}
            >
              Edit
            </button>
          }
        />
        {progress.ui?.amrapModal != null ? <ModalAmrap dispatch={props.dispatch} /> : undefined}
        {progress.ui?.weightModal != null ? (
          <ModalWeight dispatch={props.dispatch} weight={progress.ui.weightModal.weight} />
        ) : undefined}
        {progress.ui?.dateModal != null ? (
          <ModalDate dispatch={props.dispatch} date={progress.ui.dateModal.date} />
        ) : undefined}
      </section>
    );
  } else {
    return null;
  }
}
