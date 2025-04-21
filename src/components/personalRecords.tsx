import { JSX, h, Fragment } from "preact";
import { Exercise } from "../models/exercise";
import { Weight } from "../models/weight";
import { History } from "../models/history";
import { ISettings, ISet, IHistoryRecord } from "../types";
import { ObjectUtils } from "../utils/object";
import { StringUtils } from "../utils/string";
import { IPersonalRecords } from "../models/history";

interface IPersonalRecordsProps {
  historyRecords: IHistoryRecord[];
  prs: IPersonalRecords;
  settings: ISettings;
}

interface IPersonalRecordItems {
  maxWeight: Partial<Record<string, { set: ISet; prev?: ISet }[]>>;
  max1RM: Partial<Record<string, { set: ISet; prev?: ISet }[]>>;
}

export function PersonalRecords(props: IPersonalRecordsProps): JSX.Element {
  if (History.getNumberOfPersonalRecords(props.historyRecords, props.prs) === 0) {
    return (
      <section className="px-4 pt-8 pb-4 text-center">
        <div>No new personal records this time</div>
      </section>
    );
  }

  const items = props.historyRecords.reduce<IPersonalRecordItems>(
    (memo, hr) => {
      const prs = props.prs[hr.id];
      if (!prs) {
        return memo;
      }
      for (const key of ObjectUtils.keys(prs)) {
        const maxWeight = prs[key]?.maxWeightSet;
        if (maxWeight) {
          memo.maxWeight[key] = memo.maxWeight[key] || [];
          memo.maxWeight[key].push({ set: maxWeight, prev: prs[key]?.prevMaxWeightSet });
        }
        const max1RM = prs[key]?.max1RMSet;
        if (max1RM) {
          memo.max1RM[key] = memo.max1RM[key] || [];
          memo.max1RM[key].push({ set: max1RM, prev: prs[key]?.prevMax1RMSet });
        }
      }
      return memo;
    },
    { maxWeight: {}, max1RM: {} }
  );

  return (
    <section>
      <h3
        className="pb-1 font-bold text-yellow-600"
        dangerouslySetInnerHTML={{ __html: "&#x1F3C6 Personal Records" }}
      />
      {ObjectUtils.keys(items.maxWeight).length > 0 && (
        <>
          <h4 className="my-1 text-xs text-grayv2-main">Max Weight</h4>
          <ul className="pb-2">
            {ObjectUtils.keys(items.maxWeight).map((exerciseKey) => {
              const exerciseType = Exercise.fromKey(exerciseKey);
              const exercise = Exercise.get(exerciseType, props.settings.exercises);
              return (items.maxWeight[exerciseKey] || []).map((item, i) => {
                return (
                  <li key={i}>
                    <div>
                      <strong>{exercise.name}</strong>:{" "}
                      <span className="whitespace-nowrap">
                        <strong className="text-greenv2-main">
                          {Weight.display(
                            item.set.completedWeight ?? item.set.weight ?? Weight.build(0, props.settings.units)
                          )}
                        </strong>
                        , {item.set.completedReps || 0} {StringUtils.pluralize("rep", item.set.completedReps || 0)}
                      </span>
                    </div>
                    {item.prev != null && (
                      <div className="text-xs italic text-gray-700">
                        (was {item.prev.completedReps || 0} ×{" "}
                        {Weight.display(
                          item.prev.completedWeight ?? item.prev.weight ?? Weight.build(0, props.settings.units)
                        )}
                        )
                      </div>
                    )}
                  </li>
                );
              });
            })}
          </ul>
        </>
      )}
      {ObjectUtils.keys(items.max1RM).length > 0 && (
        <>
          <h4 className="my-1 text-xs text-grayv2-main">Max Estimated One Rep Max</h4>
          <ul className="pb-2">
            {ObjectUtils.keys(items.max1RM).map((exerciseKey) => {
              const exerciseType = Exercise.fromKey(exerciseKey);
              const exercise = Exercise.get(exerciseType, props.settings.exercises);
              return (items.max1RM[exerciseKey] || []).map((item, i) => {
                const estimated1RM = Weight.getOneRepMax(
                  item.set.completedWeight ?? item.set.weight ?? Weight.build(0, props.settings.units),
                  item.set.completedReps || 0,
                  item.set.completedRpe ?? item.set.rpe
                );
                const previous1RM = item.prev
                  ? Weight.getOneRepMax(
                      item.prev.completedWeight ?? item.prev.weight ?? Weight.build(0, props.settings.units),
                      item.prev.completedReps || 0,
                      item.prev.completedRpe ?? item.prev.rpe
                    )
                  : undefined;
                const setRpe = item.set.completedRpe ?? item.set.rpe;
                const prevRpe = item.prev?.completedRpe ?? item.prev?.rpe;
                return (
                  <li>
                    <div>
                      <strong>{exercise.name}</strong>:{" "}
                      <span className="whitespace-nowrap">
                        <strong className="text-greenv2-main">{Weight.display(estimated1RM)}</strong> (
                        {item.set.completedReps || 0} ×{" "}
                        {Weight.display(
                          item.set.completedWeight ?? item.set.weight ?? Weight.build(0, props.settings.units)
                        )}
                        {setRpe ? ` @${setRpe}` : ""})
                      </span>
                    </div>
                    {item.prev != null && previous1RM && (
                      <div className="text-xs italic text-gray-700">
                        (was <strong>{Weight.display(previous1RM)}</strong>, {item.prev.completedReps || 0} ×{" "}
                        {Weight.display(
                          item.prev.completedWeight ?? item.prev.weight ?? Weight.build(0, props.settings.units)
                        )}
                        {prevRpe ? ` @${prevRpe}` : ""})
                      </div>
                    )}
                  </li>
                );
              });
            })}
          </ul>
        </>
      )}
    </section>
  );
}
