import { JSX, h, Fragment } from "preact";
import { IHistoryRecord, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";
import { Exercise } from "../models/exercise";
import { Reps } from "../models/set";
import { History } from "../models/history";
import { TimeUtils } from "../utils/time";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";

interface IWorkoutShareOutputProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
}

export function WorkoutShareOutput(props: IWorkoutShareOutputProps): JSX.Element {
  const { record, settings } = props;
  if (!record) {
    return <div></div>;
  }
  const allPrs = History.getPersonalRecords(props.history);
  const recordPrs = allPrs[record.id] ?? {};
  const numberOfRecordPrs = ObjectUtils.keys(recordPrs).length;
  const entries = record.entries.filter((e) => e.sets.filter((s) => (s.completedReps ?? 0) > 0).length > 0);
  const time = TimeUtils.formatHHMM(History.workoutTime(record));
  const totalWeight = History.totalRecordWeight(record, props.settings.units);
  const totalReps = History.totalRecordReps(record);
  const totalSets = History.totalRecordSets(record);
  return (
    <div>
      <div className="flex items-end">
        <div className="flex items-start gap-2 mx-2 font-bold text-white bg-no-repeat bg-contain">
          <img src="/images/icon512.png" className="w-6 h-6 rounded-md" />
          <div className="text-lg">Liftosaur</div>
        </div>
        {numberOfRecordPrs > 0 && (
          <div className="pr-2 ml-auto font-bold text-right text-yellow-600">
            <div className="text-xl">🏆 {numberOfRecordPrs}</div>
            <div className="text-sm">Personal {StringUtils.pluralize("Record", numberOfRecordPrs)}</div>
          </div>
        )}
      </div>
      <div className="p-2 m-2 bg-white rounded-lg">
        <h2 className="text-base font-bold">{record.programName}</h2>
        <h3 className="text-base">{record.dayName}</h3>
        <div className="flex justify-between mt-1">
          <Property name="Time" value={time} />
          <Property name="Volume" value={totalWeight.value} unit={totalWeight.unit} />
          <Property name="Sets" value={totalSets} />
          <Property name="Reps" value={totalReps} />
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2 m-2 bg-white rounded-lg">
        {entries.map((entry) => {
          const prs = recordPrs[Exercise.toKey(entry.exercise)] ?? {};
          const hasPrs = ObjectUtils.keys(prs).length > 0;
          const groupedSets = Reps.group(
            entry.sets.filter((s) => (s.completedReps ?? 0) > 0),
            false
          );
          const exercise = Exercise.get(entry.exercise, settings.exercises);
          return (
            <div className="flex items-center gap-4">
              <div className="w-12" style={{ minHeight: "3rem" }}>
                <ExerciseImage size="small" className="w-full" exerciseType={exercise} settings={settings} />
              </div>
              <div className="flex-1">
                <span className="font-bold">
                  {exercise.name}
                  {hasPrs ? " 🏆" : ""}
                </span>
              </div>
              <div className="text-right">
                {groupedSets.map((group) => {
                  const set = group[0];
                  const isPr = ObjectUtils.keys(prs).some((k) => {
                    const prset = prs[k];
                    return prset && Reps.isSameSet(set, prset);
                  });
                  const success = (set.completedReps ?? 0) >= set.reps;
                  return (
                    <div className={`${isPr ? "bg-yellow-200" : ""}`}>
                      {group.length > 1 && (
                        <>
                          <span className="font-bold text-purplev2-main">{group.length}</span>
                          <span className="text-grayv2-main"> × </span>
                        </>
                      )}
                      <span className={`font-bold ${success ? "text-greenv2-main" : "text-redv2-main"}`}>
                        {set.completedReps}
                      </span>
                      <span className="text-grayv2-main"> × </span>
                      <span>{set.weight.value}</span>
                      <span className="text-xs text-grayv2-main">{set.weight.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Property(props: { name: string; value: string | number; unit?: string }): JSX.Element {
  return (
    <div>
      <div className="text-xs text-grayv2-main">{props.name}</div>
      <div>
        <span className="text-xl font-bold">{props.value}</span>
        {props.unit && <span className="ml-1 text-sm">{props.unit}</span>}
      </div>
    </div>
  );
}
