import { JSX, memo, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISet, ISettings, IWeight } from "../types";
import { Weight_display, Weight_convertTo, Weight_build } from "../models/weight";
import { DateUtils_format } from "../utils/date";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { Thunk_editHistoryRecord } from "../ducks/thunks";
import { useTrackClick } from "../utils/clickTracking";
import { IRepPersonalRecord } from "../models/history";

interface IExerciseAllTimePRsProps {
  settings: ISettings;
  dispatch: IDispatch;
  maxWeight?: { weight: IWeight; historyRecord?: IHistoryRecord };
  max1RM?: { weight: IWeight; set?: ISet; historyRecord?: IHistoryRecord };
  repPersonalRecords?: Partial<Record<number, IRepPersonalRecord>>;
}

function ExerciseAllTimePRsInner(props: IExerciseAllTimePRsProps): JSX.Element {
  const { maxWeight, max1RM } = props;
  const trackClick = useTrackClick();
  const [areRepRecordsExpanded, setAreRepRecordsExpanded] = useState(false);
  const repRecords = Array.from({ length: 12 }, (_, index) => index + 1).flatMap((reps) => {
    const record = props.repPersonalRecords?.[reps];
    return record ? [{ reps, record }] : [];
  });

  return (
    <View
      data-testid="exercise-stats-pr"
      testID="exercise-stats-pr"
      className="px-4 py-2 bg-background-cardpurple rounded-2xl"
    >
      <GroupHeader topPadding={false} name="🏆 Personal Records" />
      {maxWeight && (
        <MenuItem
          name="Max Weight"
          expandName={true}
          onClick={() => {
            trackClick("exercise-pr-record");
            if (maxWeight.historyRecord) {
              props.dispatch(Thunk_editHistoryRecord(maxWeight.historyRecord));
            }
          }}
          value={
            <View>
              <Text className="text-text-primary text-right" data-testid="max-weight-value" testID="max-weight-value">
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
          isBorderless={repRecords.length === 0}
          expandValue={true}
          onClick={() => {
            trackClick("exercise-pr-record");
            if (max1RM.historyRecord) {
              props.dispatch(Thunk_editHistoryRecord(max1RM.historyRecord));
            }
          }}
          name="Max 1RM"
          value={
            <View>
              <Text className="text-text-primary text-right" data-testid="one-rm-value" testID="one-rm-value">
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
      {repRecords.length > 0 && (
        <MenuItem
          isBorderless={!areRepRecordsExpanded}
          expandValue={true}
          onClick={() => {
            trackClick("exercise-pr-records-toggle");
            setAreRepRecordsExpanded((isExpanded) => !isExpanded);
          }}
          name={`Rep PRs (${repRecords.length})`}
          value={
            <Text className="text-text-secondary text-right" data-testid="rep-prs-toggle" testID="rep-prs-toggle">
              {areRepRecordsExpanded ? "Hide" : "Show"}
            </Text>
          }
          shouldShowRightArrow={false}
        />
      )}
      {areRepRecordsExpanded &&
        repRecords.map(({ reps, record }, index) => (
          <MenuItem
            key={reps}
            isBorderless={index === repRecords.length - 1}
            expandValue={true}
            onClick={() => {
              trackClick("exercise-pr-record");
              props.dispatch(Thunk_editHistoryRecord(record.historyRecord));
            }}
            name={`Max ${reps}RM`}
            value={
              <View>
                <Text
                  className="text-text-primary text-right"
                  data-testid={`rep-pr-${reps}-value`}
                  testID={`rep-pr-${reps}-value`}
                >
                  {Weight_display(Weight_convertTo(record.weight, props.settings.units))}
                </Text>
                <Text className="text-xs text-text-secondary text-right">
                  {DateUtils_format(record.historyRecord.startTime)}
                </Text>
              </View>
            }
            shouldShowRightArrow={true}
          />
        ))}
    </View>
  );
}

export const ExerciseAllTimePRs = memo(ExerciseAllTimePRsInner);
