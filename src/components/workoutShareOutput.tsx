import { JSX, h, Fragment } from "preact";
import { IHistoryRecord, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";
import { Exercise } from "../models/exercise";
import { Reps } from "../models/set";
import { IRect } from "../utils/types";

interface IWorkoutShareOutputProps {
  record: IHistoryRecord;
  settings: ISettings;
  rect: IRect;
}

export function WorkoutShareOutput(props: IWorkoutShareOutputProps): JSX.Element {
  const { record, settings } = props;
  const entries = record.entries.filter((e) => e.sets.filter((s) => (s.completedReps ?? 0) > 0).length > 0);
  return (
    <div>
      <div className="p-2 m-2 bg-white rounded-lg">
        <h2 className="text-base font-bold">{record.programName}</h2>
        <h3 className="text-base">{record.dayName}</h3>
        <div className="flex justify-between mt-1">
          <Property name="Time" value="58" unit="min" />
          <Property name="Volume" value="12312" unit="lb" />
          <Property name="Sets" value="35" />
          <Property name="Reps" value="123" />
        </div>
      </div>
      <div className="p-2 m-2 bg-white rounded-lg">
        {entries.map((entry) => {
          const groupedSets = Reps.group(
            entry.sets.filter((s) => (s.completedReps ?? 0) > 0),
            false
          );
          const exercise = Exercise.get(entry.exercise, settings.exercises);
          return (
            <div className="flex items-center gap-4">
              <div className="w-12">
                <ExerciseImage size="small" exerciseType={exercise} settings={settings} />
              </div>
              <div className="flex-1">
                <span className="font-bold">{exercise.name}</span>
              </div>
              <div className="text-right">
                {groupedSets.map((group) => {
                  const set = group[0];
                  const success = (set.completedReps ?? 0) >= set.reps;
                  return (
                    <div>
                      {group.length > 1 && (
                        <>
                          <span className="font-bold text-purplev2-main">{group.length}</span>
                          <span className="text-grayv2-main"> × </span>
                        </>
                      )}
                      <span className={`font-bold ${success ? "text-redv2-main" : "text-greenv2-main"}`}>
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

function Property(props: { name: string; value: string; unit?: string }): JSX.Element {
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
