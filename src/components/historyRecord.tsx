import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { CollectionUtils } from "../utils/collection";
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

  const entries = CollectionUtils.inGroupsOfFilled(2, historyRecord.entries);
  return (
    <div
      data-cy="history-record"
      className={`history-record-${nickname} px-3 text-xs ${props.nickname ? "bg-orange-100" : ""}`}
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
      <div className="py-3 border-b border-gray-300">
        {props.nickname && <div className="text-xs italic text-right">{props.nickname}</div>}
        <div className="flex">
          <div className="flex-1 font-bold" data-cy="history-record-date">
            {Progress.isCurrent(historyRecord)
              ? Progress.isFullyEmptySet(historyRecord)
                ? "Next"
                : "Ongoing"
              : DateUtils.format(historyRecord.date)}
          </div>
          <div className="text-gray-600" data-cy="history-record-program">
            {historyRecord.programName}, {historyRecord.dayName}
          </div>
        </div>
        {entries.map((group) => (
          <div className="flex flex-row" data-cy="history-entry">
            {group.map((entry, i) => {
              let className: string;
              if (group.length === 1 || i !== group.length - 1) {
                className = "flex flex-row flex-1 mr-2";
              } else {
                className = "flex flex-row flex-1";
              }
              if (entry != null) {
                const exercise = Exercise.get(entry.exercise, props.settings.exercises);
                return (
                  <div data-cy="history-entry-exercise" className={className}>
                    <div data-cy="history-entry-exercise-name" style={{ flex: 2 }}>
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
              } else {
                return <div className={className}></div>;
              }
            })}
          </div>
        ))}
        {!Progress.isCurrent(historyRecord) && historyRecord.startTime != null && historyRecord.endTime != null && (
          <div className="flex items-center mt-1 text-gray-600" style={{ minHeight: "1.8em" }}>
            <div className="flex-1">
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
            <div className="text-right">
              <span>Time:</span>{" "}
              <span className="font-bold">{TimeUtils.formatHHMM(historyRecord.endTime - historyRecord.startTime)}</span>
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
