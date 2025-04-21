import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { Equipment } from "../models/equipment";
import { Exercise } from "../models/exercise";
import { Weight } from "../models/weight";
import { IHistoryEntry, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";
import { IHistoryEntryPersonalRecords } from "../models/history";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { ObjectUtils } from "../utils/object";

interface IHistoryEntryProps {
  entry: IHistoryEntry;
  prs?: IHistoryEntryPersonalRecords;
  isOngoing?: boolean;
  isLast?: boolean;
  isNext: boolean;
  settings: ISettings;
  showNotes: boolean;
}

export const HistoryEntryView = memo((props: IHistoryEntryProps): JSX.Element => {
  const { entry, isNext, settings, showNotes, isOngoing, isLast } = props;
  const exercise = Exercise.get(entry.exercise, settings.exercises);
  const exerciseUnit = Equipment.getUnitOrDefaultForExerciseType(settings, exercise);
  const isPr = ObjectUtils.values(props.prs || {}).some((v) => v);
  return (
    <div data-cy="history-entry-exercise" className={`flex flex-row items-center flex-1`}>
      <div data-cy="history-entry-exercise-img py-2" style={{ minWidth: "2.25rem" }}>
        <ExerciseImage settings={props.settings} className="w-6 mr-3" exerciseType={exercise} size="small" />
      </div>
      <div
        className={`flex-1 py-2 ${
          !isLast
            ? `border-b ${isNext ? (isOngoing ? "border-yellowv3-200" : "border-purplev3-200") : "border-grayv3-200"}`
            : ""
        }`}
      >
        <div className="flex items-center gap-2 min-h-8">
          <div>
            <div data-cy="history-entry-exercise-name" className="font-semibold">
              {Exercise.nameWithEquipment(exercise, props.settings)}
              {isPr && " 🏆"}
            </div>
          </div>
          <div className="flex-1 text-right">
            <HistoryRecordSetsView
              sets={entry.sets.map((set) => ({
                ...set,
                weight:
                  isNext && set.weight
                    ? Weight.roundConvertTo(set.weight, props.settings, exerciseUnit, entry.exercise)
                    : set.weight,
              }))}
              prs={props.prs}
              settings={props.settings}
              isNext={isNext}
            />
          </div>
        </div>
        {showNotes && entry.notes && <p className="mt-1 text-sm text-grayv2-main">{entry.notes}</p>}
      </div>
    </div>
  );
});
