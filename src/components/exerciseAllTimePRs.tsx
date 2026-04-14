import { JSX, memo } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISet, ISettings, IWeight } from "../types";
import { Weight_display, Weight_convertTo, Weight_build } from "../models/weight";
import { DateUtils_format } from "../utils/date";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { Thunk_editHistoryRecord } from "../ducks/thunks";

interface IExerciseAllTimePRsProps {
  settings: ISettings;
  dispatch: IDispatch;
  maxWeight?: { weight: IWeight; historyRecord?: IHistoryRecord };
  max1RM?: { weight: IWeight; set?: ISet; historyRecord?: IHistoryRecord };
}

function ExerciseAllTimePRsInner(props: IExerciseAllTimePRsProps): JSX.Element {
  const { maxWeight, max1RM } = props;

  return (
    <View data-cy="exercise-stats-pr" className="px-4 py-2 bg-background-cardpurple rounded-2xl">
      <GroupHeader topPadding={false} name="🏆 Personal Records" />
      {maxWeight && (
        <MenuItem
          name="Max Weight"
          expandName={true}
          onClick={() => maxWeight.historyRecord && props.dispatch(Thunk_editHistoryRecord(maxWeight.historyRecord))}
          value={
            <View>
              <Text className="text-text-primary text-right" data-cy="max-weight-value">
                {Weight_display(Weight_convertTo(maxWeight.weight, props.settings.units))}
              </Text>
              {maxWeight.historyRecord && (
                <Text className="text-xs text-text-secondary text-right">
                  {DateUtils_format(maxWeight.historyRecord.startTime)}
                </Text>
              )}
            </View>
          }
          shouldShowRightArrow={true}
        />
      )}
      {max1RM && (
        <MenuItem
          isBorderless={true}
          expandValue={true}
          onClick={() => max1RM.historyRecord && props.dispatch(Thunk_editHistoryRecord(max1RM.historyRecord))}
          name="Max 1RM"
          value={
            <View>
              <Text className="text-text-primary text-right" data-cy="one-rm-value">
                {Weight_display(Weight_convertTo(max1RM.weight, props.settings.units))}
                {max1RM.set
                  ? ` (${max1RM.set.completedReps} x ${Weight_display(max1RM.set.completedWeight ?? max1RM.set.weight ?? Weight_build(0, props.settings.units))})`
                  : ""}
              </Text>
              {max1RM.historyRecord && (
                <Text className="text-xs text-text-secondary text-right">
                  {DateUtils_format(max1RM.historyRecord.startTime)}
                </Text>
              )}
            </View>
          }
          shouldShowRightArrow={true}
        />
      )}
    </View>
  );
}

export const ExerciseAllTimePRs = memo(ExerciseAllTimePRsInner);
