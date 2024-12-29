import React, { JSX } from "react";
import { memo } from "react";
import { Equipment } from "../models/equipment";
import { Exercise } from "../models/exercise";
import { Weight } from "../models/weight";
import { IHistoryEntry, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";
import { HistoryRecordSetsView } from "./historyRecordSets";

interface IHistoryEntryProps {
  entry: IHistoryEntry;
  isNext: boolean;
  isLast?: boolean;
  settings: ISettings;
  showNotes: boolean;
}

export const HistoryEntryView = memo(
  (props: IHistoryEntryProps): JSX.Element => {
    const { entry, isNext, isLast, settings, showNotes } = props;
    const exercise = Exercise.get(entry.exercise, settings.exercises);
    const exerciseUnit = Equipment.getUnitOrDefaultForExerciseType(settings, exercise);
    return (
      <div
        data-cy="history-entry-exercise"
        className={`flex flex-row items-center flex-1 py-1 ${!isLast ? "border-b border-grayv2-100" : ""}`}
      >
        <div data-cy="history-entry-exercise-img" style={{ minWidth: "2.25rem" }}>
          <ExerciseImage settings={props.settings} className="w-6 mr-3" exerciseType={exercise} size="small" />
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <div className="pr-2" style={{ width: "50%" }}>
              <div data-cy="history-entry-exercise-name" className="font-bold">
                {Exercise.nameWithEquipment(exercise, props.settings)}
              </div>
            </div>
            <div className="flex-1">
              <HistoryRecordSetsView
                sets={entry.sets.map((set) => ({
                  ...set,
                  weight: isNext
                    ? Weight.roundConvertTo(set.weight, props.settings, exerciseUnit, entry.exercise)
                    : set.weight,
                }))}
                settings={props.settings}
                isNext={isNext}
              />
            </div>
          </div>
          {showNotes && entry.notes && <p className="mt-1 text-sm text-grayv2-main">{entry.notes}</p>}
        </div>
      </div>
    );
  }
);
