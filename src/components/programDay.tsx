import { h, JSX, Fragment } from "preact";
import { CardsView } from "./cards";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord } from "../models/history";
import { ModalAmrap } from "./modalAmrap";
import { DateUtils } from "../utils/date";
import { ModalWeight } from "./modalWeight";
import { Timer } from "./timer";
import { IProgressMode, Progress } from "../models/progress";
import { ModalDate } from "./modalDate";
import { ISettings } from "../models/settings";
import { IconEdit } from "./iconEdit";
import { IProgram } from "../models/program";
import { IWebpushr } from "../models/state";
import { ModalShare } from "./modalShare";
import { useState } from "preact/hooks";

interface IProps {
  progress: IHistoryRecord;
  program?: IProgram;
  settings: ISettings;
  isChanged: boolean;
  userId?: string;
  dispatch: IDispatch;
  timerSince?: number;
  timerMode?: IProgressMode;
  webpushr?: IWebpushr;
}

export function ProgramDayView(props: IProps): JSX.Element | null {
  const progress = props.progress;
  const timers = props.settings.timers;
  const [isShareShown, setIsShareShown] = useState<boolean>(false);

  if (progress != null) {
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
          subtitle={progress.programName}
          left={
            <button
              onClick={() => {
                if (!props.isChanged || Progress.isCurrent(progress) || confirm("Are you sure?")) {
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
          settings={props.settings}
          program={props.program}
          progress={progress}
          isTimerShown={!!props.timerSince}
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
            <Fragment>
              {/* {!Progress.isCurrent(props.progress) ? (
                <button className="p-4" onClick={() => setIsShareShown(true)}>
                  <IconShare />
                </button>
              ) : undefined} */}
              {Progress.isCurrent(props.progress) ? (
                <button
                  className="p-4"
                  onClick={() => Progress.editDayAction(props.dispatch, progress.programId, progress.day - 1)}
                >
                  <IconEdit size={24} lineColor="#A5B3BB" penColor="white" />
                </button>
              ) : undefined}
            </Fragment>
          }
        />
        <ModalAmrap isHidden={progress.ui?.amrapModal == null} dispatch={props.dispatch} />
        <ModalWeight
          isHidden={progress.ui?.weightModal == null}
          units={props.settings.units}
          dispatch={props.dispatch}
          weight={progress.ui?.weightModal?.weight ?? 0}
        />
        <ModalDate
          isHidden={progress.ui?.dateModal == null}
          dispatch={props.dispatch}
          date={progress.ui?.dateModal?.date ?? ""}
        />
        {isShareShown && !Progress.isCurrent(progress) && props.userId != null && (
          <ModalShare userId={props.userId} id={progress.id} onClose={() => setIsShareShown(false)} />
        )}
      </section>
    );
  } else {
    return null;
  }
}
