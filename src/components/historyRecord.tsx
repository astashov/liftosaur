import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { DateUtils } from "../utils/date";
import { Exercise } from "../models/exercise";
import { TimeUtils } from "../utils/time";
import { Progress } from "../models/progress";
import { ComparerUtils } from "../utils/comparer";
import { memo } from "preact/compat";
import { IHistoryRecord, ISettings } from "../types";
import { IconComments } from "./icons/iconComments";
import { IAllComments, IAllLikes } from "../models/state";
import { HtmlUtils } from "../utils/html";
import { ButtonLike } from "./buttonLike";
import { IconWatch } from "./icons/iconWatch";
import { IconProfile } from "./icons/iconProfile";
import { ExerciseImage } from "./exerciseImage";
import { HistoryRecordSetsView } from "./historyRecordSets";

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
      className={`history-record-${nickname} rounded-2xl mx-4 mb-4 px-4 text-sm ${
        props.nickname ? "bg-orange-100" : Progress.isCurrent(historyRecord) ? "bg-purplev2-200" : "bg-grayv2-50"
      }`}
      style={{ boxShadow: "0 3px 3px -3px rgba(0, 0, 0, 0.1)" }}
      onClick={(event) => {
        if (!HtmlUtils.classInParents(event.target as Element, "button")) {
          if (Progress.isCurrent(historyRecord)) {
            dispatch({ type: "StartProgramDayAction" });
          } else {
            editHistoryRecord(
              historyRecord,
              dispatch,
              Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord),
              props.friendId
            );
          }
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
              <div
                data-cy="history-entry-exercise"
                className="flex flex-row items-center flex-1 py-1 border-b border-grayv2-100"
              >
                <div data-cy="history-entry-exercise-img" style={{ minWidth: "2.25rem" }}>
                  <ExerciseImage
                    className="w-6 mr-3"
                    exerciseType={exercise}
                    size="small"
                    customExercises={props.settings.exercises}
                  />
                </div>
                <div data-cy="history-entry-exercise-name" className="pr-2 font-bold" style={{ width: "35%" }}>
                  {exercise.name}
                </div>
                <div className="flex-1">
                  <HistoryRecordSetsView
                    sets={entry.sets}
                    unit={props.settings.units}
                    isNext={Progress.isCurrent(historyRecord) && Progress.isFullyEmptySet(historyRecord)}
                  />
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
                <span className="p-2 align-center">
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

function editHistoryRecord(historyRecord: IHistoryRecord, dispatch: IDispatch, isNext: boolean, userId?: string): void {
  if (!isNext) {
    dispatch({ type: "EditHistoryRecord", historyRecord, userId });
  }
}
