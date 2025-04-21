import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISet, ISettings, IWeight } from "../types";
import { Weight } from "../models/weight";
import { DateUtils } from "../utils/date";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";

interface IExerciseAllTimePRsProps {
  settings: ISettings;
  dispatch: IDispatch;
  maxWeight?: { weight: IWeight; historyRecord?: IHistoryRecord };
  max1RM?: { weight: IWeight; set?: ISet; historyRecord?: IHistoryRecord };
}

export function ExerciseAllTimePRs(props: IExerciseAllTimePRsProps): JSX.Element {
  const { maxWeight, max1RM } = props;

  return (
    <section data-cy="exercise-stats-pr" className="px-4 py-2 bg-purple-100 rounded-2xl">
      <GroupHeader topPadding={false} name="🏆 Personal Records" />
      {maxWeight && (
        <MenuItem
          name="Max Weight"
          expandName={true}
          onClick={() =>
            maxWeight.historyRecord &&
            props.dispatch({ type: "EditHistoryRecord", historyRecord: maxWeight.historyRecord })
          }
          value={
            <div className="text-blackv2">
              <div data-cy="max-weight-value">
                {Weight.display(Weight.convertTo(maxWeight.weight, props.settings.units))}
              </div>
              {maxWeight.historyRecord && (
                <div className="text-xs text-grayv2-main">{DateUtils.format(maxWeight.historyRecord.startTime)}</div>
              )}
            </div>
          }
          shouldShowRightArrow={true}
        />
      )}
      {max1RM && (
        <MenuItem
          isBorderless={true}
          expandValue={true}
          onClick={() =>
            max1RM.historyRecord && props.dispatch({ type: "EditHistoryRecord", historyRecord: max1RM.historyRecord })
          }
          name="Max 1RM"
          value={
            <div className="text-blackv2">
              <div data-cy="one-rm-value">
                {Weight.display(Weight.convertTo(max1RM.weight, props.settings.units))}
                {max1RM.set
                  ? ` (${max1RM.set.completedReps} x ${Weight.display(max1RM.set.completedWeight ?? max1RM.set.weight ?? Weight.build(0, props.settings.units))})`
                  : ""}
              </div>
              {max1RM.historyRecord && (
                <div className="text-xs text-grayv2-main">{DateUtils.format(max1RM.historyRecord.startTime)}</div>
              )}
            </div>
          }
          shouldShowRightArrow={true}
        />
      )}
    </section>
  );
}
