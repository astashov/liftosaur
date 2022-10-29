import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Reps } from "../models/set";
import { DateUtils } from "../utils/date";
import { Exercise } from "../models/exercise";
import { TimeUtils } from "../utils/time";
import { Progress } from "../models/progress";
import { Weight } from "../models/weight";
import { ComparerUtils } from "../utils/comparer";
import { memo } from "preact/compat";
import { IHistoryRecord, ISettings, ISet } from "../types";
import { IconComments } from "./iconComments";
import { IAllComments, IAllLikes } from "../models/state";
import { HtmlUtils } from "../utils/html";
import { ButtonLike } from "./buttonLike";
import { IconWatch } from "./iconWatch";
import { IconProfile } from "./iconProfile";

interface IProps {
  historyRecord: IHistoryRecord;
  settings: ISettings;
  comments: IAllComments;
  dispatch: IDispatch;
  likes?: IAllLikes;
  userId?: string;
  friendId?: string;
  nickname?: string;
}

export const HistoryRecordView = memo((props: IProps): JSX.Element => {
  const { historyRecord, dispatch, nickname, friendId } = props;

  const entries = historyRecord.entries;
  return (
    <div
      data-cy="history-record"
      className={`history-record-${nickname} rounded-2xl m-4 px-4 text-sm ${
        props.nickname ? "bg-orange-100" : Progress.isCurrent(historyRecord) ? "bg-purplev2-100" : "bg-grayv2-50"
      }`}
      style={{ boxShadow: "0 3px 3px -3px rgba(0, 0, 0, 0.1)" }}
      onClick={(event) => {
        if (!HtmlUtils.classInParents(event.target as Element, "button")) {
          editHistoryRecord(
            historyRecord,
            dispatch,
            Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord),
            props.friendId
          );
        }
      }}
    >
      <div className="py-4">
        {props.nickname && (
          <div>
            <IconProfile /> {props.nickname}
          </div>
        )}
        <div className="flex">
          <div className="flex-1 font-bold" data-cy="history-record-date">
            {Progress.isCurrent(historyRecord)
              ? Progress.isFullyEmptySet(historyRecord)
                ? "Next"
                : "Ongoing"
              : DateUtils.format(historyRecord.date)}
          </div>
          <div className="flex-1 text-xs text-right text-gray-600" data-cy="history-record-program">
            {historyRecord.programName}, {historyRecord.dayName}
          </div>
        </div>
        <div className="flex flex-col mt-2" data-cy="history-entry">
          {entries.map((entry) => {
            const exercise = Exercise.get(entry.exercise, props.settings.exercises);
            return (
              <div data-cy="history-entry-exercise" className="flex flex-row flex-1">
                <div data-cy="history-entry-exercise-name flex-1" style={{ maxWidth: "50%" }}>
                  {exercise.name}
                </div>
                <div className="flex-1 text-right">
                  <HistoryRecordSetsView
                    sets={entry.sets}
                    isNext={Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord)}
                  />
                </div>
                <div data-cy="history-entry-weight" className="w-8 ml-1 font-bold text-right">
                  {Math.max(...entry.sets.map((s) => Weight.convertTo(s.weight, props.settings.units).value))}
                </div>
              </div>
            );
          })}
        </div>
        {!Progress.isCurrent(historyRecord) && historyRecord.startTime != null && historyRecord.endTime != null && (
          <div className="flex items-center mt-1 text-gray-600" style={{ minHeight: "1.8em" }}>
            <div className="text-left">
              <IconWatch />{" "}
              <span className="inline-block align-middle" style={{ paddingTop: "2px" }}>
                {TimeUtils.formatHHMM(historyRecord.endTime - historyRecord.startTime)}
              </span>
            </div>
            <div className="flex-1 text-right">
              <ButtonLike
                dispatch={dispatch}
                historyRecordId={historyRecord.id}
                userId={props.userId}
                friendId={friendId}
                likes={props.likes}
              />
              {props.comments.comments[historyRecord.id] != null ? (
                <span className="align-top">
                  <IconComments />
                  <span className="pl-1">{props.comments.comments[historyRecord.id]?.length || 0}</span>
                </span>
              ) : undefined}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, ComparerUtils.noFns);

function HistoryRecordSetsView(props: { sets: ISet[]; isNext: boolean }): JSX.Element {
  const { sets, isNext } = props;
  if (isNext) {
    return (
      <span data-cy="history-entry-sets-next" className="text-gray-600">
        {Reps.display(sets, isNext)}
      </span>
    );
  } else {
    if (Reps.isCompleted(sets)) {
      return (
        <span data-cy="history-entry-sets-completed" className="text-green-600">
          {Reps.display(sets)}
        </span>
      );
    } else {
      return (
        <span data-cy="history-entry-sets-incompleted" className="text-red-600">
          {Reps.display(sets)}
        </span>
      );
    }
  }
}

function editHistoryRecord(historyRecord: IHistoryRecord, dispatch: IDispatch, isNext: boolean, userId?: string): void {
  if (!isNext) {
    dispatch({ type: "EditHistoryRecord", historyRecord, userId });
  }
}
