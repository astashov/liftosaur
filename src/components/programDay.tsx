import { h, JSX, Fragment } from "preact";
import { CardsView } from "./cards";
import { HeaderView } from "./header";
import { FooterView } from "./footer";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord } from "../models/history";
import { ModalAmrap } from "./modalAmrap";
import { DateUtils } from "../utils/date";
import { ModalWeight } from "./modalWeight";
import { RestTimer } from "./restTimer";
import { IProgressMode, Progress } from "../models/progress";
import { ModalDate } from "./modalDate";
import { ISettings } from "../models/settings";
import { IconEdit } from "./iconEdit";
import { IProgram } from "../models/program";
import { IWebpushr } from "../models/state";
import { ModalShare } from "./modalShare";
import { useState } from "preact/hooks";
import { IconShare } from "./iconShare";
import { IconMuscles } from "./iconMuscles";
import { Thunk } from "../ducks/thunks";
import { ModalEditSet } from "./modalEditSet";
import { ISet } from "../models/set";
import { EditProgressEntry } from "../models/editProgressEntry";

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
          onStartSetChanging={(isWarmup: boolean, entryIndex: number, setIndex?: number) => {
            EditProgressEntry.showEditSetModal(props.dispatch, isWarmup, entryIndex, setIndex);
          }}
        />
        <RestTimer
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
              <button
                className="p-4"
                aria-label="Muscles"
                onClick={() => props.dispatch(Thunk.pushScreen("musclesDay"))}
              >
                <IconMuscles />
              </button>
              {!Progress.isCurrent(props.progress) ? (
                <button
                  className="p-4"
                  onClick={() => {
                    if (props.userId == null) {
                      alert("You should be logged in to share workouts.");
                    } else {
                      setIsShareShown(true);
                    }
                  }}
                >
                  <IconShare />
                </button>
              ) : undefined}
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
        <ModalEditSet
          isHidden={progress.ui?.editSetModal == null}
          dispatch={props.dispatch}
          units={props.settings.units}
          set={getEditSetData(props.progress)}
          isWarmup={progress.ui?.editSetModal?.isWarmup || false}
          entryIndex={progress.ui?.editSetModal?.entryIndex || 0}
          setIndex={progress.ui?.editSetModal?.setIndex}
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

function getEditSetData(progress: IHistoryRecord): ISet | undefined {
  const uiData = progress.ui?.editSetModal;
  if (uiData != null && uiData.setIndex != null) {
    const entry = progress.entries[uiData.entryIndex];
    if (entry != null) {
      const set = uiData.isWarmup ? entry.warmupSets[uiData.setIndex] : entry.sets[uiData.setIndex];
      return set;
    }
  }
  return undefined;
}
