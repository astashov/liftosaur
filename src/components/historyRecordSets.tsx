import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IDisplaySet, Reps_group, Reps_setToDisplaySet } from "../models/set";
import { ISet, ISettings } from "../types";
import { CollectionUtils_groupBy, CollectionUtils_compact } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { IHistoryEntryPersonalRecords } from "../models/history";

function isSameDisplaySet(a: IDisplaySet, b: IDisplaySet): boolean {
  return (
    a.reps === b.reps && a.weight === b.weight && a.rpe === b.rpe && a.askWeight === b.askWeight && a.timer === b.timer
  );
}

export function groupDisplaySets(displaySets: IDisplaySet[]): IDisplaySet[][] {
  return CollectionUtils_groupBy(displaySets, (last, set) => {
    return !isSameDisplaySet(last, set);
  });
}

interface IHistoryRecordSetsProps {
  showPrDetails?: boolean;
  sets: ISet[];
  isNext: boolean;
  settings: ISettings;
  prs?: IHistoryEntryPersonalRecords;
}

export function HistoryRecordSetsView(props: IHistoryRecordSetsProps): JSX.Element {
  const { sets, isNext } = props;
  const groups = Reps_group(sets, isNext);
  const displayGroups = groups.map((g) => {
    return g.map((set) => Reps_setToDisplaySet(set, isNext, props.settings));
  });
  return (
    <View className="text-sm" style={{ alignItems: "flex-end" }}>
      {displayGroups.map((g, i) => (
        <HistoryRecordSet
          key={i}
          sets={g}
          prs={props.prs}
          isNext={props.isNext}
          showPrDetails={props.showPrDetails}
          settings={props.settings}
        />
      ))}
    </View>
  );
}

interface IHistoryRecordSet2Props {
  prs?: IHistoryEntryPersonalRecords;
  settings: ISettings;
  showPrDetails?: boolean;
  sets: IDisplaySet[];
  isNext: boolean;
}

export function HistoryRecordSet(props: IHistoryRecordSet2Props): JSX.Element {
  const { isNext } = props;
  const group = props.sets;
  const set = group[0];
  if (set == null) {
    return <View />;
  }
  const prTypes = CollectionUtils_compact(
    ObjectUtils_keys(props.prs || {}).map<"e1RM" | "Weight" | undefined>((k) => {
      const prset = (props.prs || {})[k];
      if (!prset) {
        return undefined;
      }
      const displayPrSet = Reps_setToDisplaySet(prset, isNext, props.settings);
      return isSameDisplaySet(set, displayPrSet)
        ? k === "max1RMSet"
          ? "e1RM"
          : k === "maxWeightSet"
            ? "Weight"
            : undefined
        : undefined;
    })
  );
  const isPr = prTypes.length > 0;
  const repsColor = isNext
    ? "text-text-secondary"
    : set.isCompleted
      ? "text-text-success"
      : set.isInRange
        ? "text-orange-400"
        : "text-text-error";
  const rpeColor = isNext ? "text-text-secondary" : set.isRpeFailed ? "text-text-error" : "text-text-success";
  const timerColor = isNext ? "text-text-secondary" : "text-text-purple";
  const dataCy = isNext
    ? "history-entry-sets-next"
    : set.isCompleted
      ? "history-entry-sets-completed"
      : set.isInRange
        ? "history-entry-sets-in-range"
        : "history-entry-sets-incompleted";
  return (
    <View className="flex-row items-center" data-testid={dataCy} testID={dataCy}>
      {props.showPrDetails && isPr && (
        <View className="flex-row items-center mr-2">
          <Text className="text-xs font-semibold leading-6 text-yellow-600">{prTypes.join(", ")} </Text>
          <Text className="text-sm leading-6">{"\u{1F3C6}"}</Text>
        </View>
      )}
      <Text className={`px-1 text-sm leading-6 ${isPr ? "bg-color-yellow150 " : ""}`}>
        {group.length > 1 && (
          <>
            <Text
              className="text-sm font-semibold text-text-purple"
              data-testid="history-entry-sets"
              testID="history-entry-sets"
            >
              {group.length}
            </Text>
            <Text className="text-sm text-text-secondary"> {"\u00D7"} </Text>
          </>
        )}
        <Text
          className={`font-semibold ${repsColor} text-sm`}
          data-testid="history-entry-reps"
          testID="history-entry-reps"
        >
          {set.reps}
        </Text>
        {set.weight && (
          <>
            <Text className="text-sm text-text-secondary"> {"\u00D7"} </Text>
            <Text data-testid="history-entry-weight" testID="history-entry-weight">
              <Text className="text-sm font-semibold">{set.weight}</Text>
              <Text className="text-sm">{set.askWeight ? "+" : ""}</Text>
              <Text className="text-sm text-text-secondary">{set.unit}</Text>
            </Text>
          </>
        )}
        {set.rpe != null && (
          <Text className={rpeColor} data-testid="history-entry-rpe" testID="history-entry-rpe">
            <Text className="text-xs"> @</Text>
            <Text className="text-sm">{set.rpe}</Text>
          </Text>
        )}
        {set.timer != null && (
          <Text className={timerColor} data-testid="history-entry-timer" testID="history-entry-timer">
            <Text className="text-sm"> {set.timer}</Text>
            <Text className="text-xs">s</Text>
          </Text>
        )}
      </Text>
    </View>
  );
}
