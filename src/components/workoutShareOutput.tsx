import { JSX, h } from "preact";
import { IHistoryRecord, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";
import { Exercise } from "../models/exercise";
import { History } from "../models/history";
import { TimeUtils } from "../utils/time";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { HistoryRecordSetsView } from "./historyRecordSets";

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
          const exercise = Exercise.get(entry.exercise, settings.exercises);
          return (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12" style={{ minHeight: "3rem" }}>
                <ExerciseImage
                  size="small"
                  className="object-contain w-full h-full"
                  suppressCustom={true}
                  exerciseType={exercise}
                  settings={settings}
                />
              </div>
              <div className="flex-1">
                <span className="font-bold">
                  {exercise.name}
                  {hasPrs ? " 🏆" : ""}
                </span>
              </div>
              <div className="text-right">
                <HistoryRecordSetsView sets={entry.sets} prs={prs} settings={settings} isNext={false} />
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
