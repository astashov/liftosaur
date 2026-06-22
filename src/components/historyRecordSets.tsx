import { JSX, memo, useMemo } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { FastText } from "./primitives/fastText";
import { IDisplaySet, Reps_group, Reps_setToDisplaySet } from "../models/set";
import { ISet, IUnit } from "../types";
import { CollectionUtils_compact } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { IHistoryEntryPersonalRecords } from "../models/history";
import { StyledText, StyledText_remToPx } from "../utils/styledText";
import { useRem } from "../utils/useRem";
import { Tailwind_semantic, Tailwind_colors } from "../utils/tailwindConfig";
import { TimeUtils_formatMMSS } from "../utils/time";

function isSameDisplaySet(a: IDisplaySet, b: IDisplaySet): boolean {
  return (
    a.reps === b.reps &&
    a.weight === b.weight &&
    a.rpe === b.rpe &&
    a.askWeight === b.askWeight &&
    a.timer === b.timer &&
    a.setTimer === b.setTimer
  );
}

interface IHistoryRecordSetsProps {
  showPrDetails?: boolean;
  sets: ISet[];
  isNext: boolean;
  units: IUnit;
  prs?: IHistoryEntryPersonalRecords;
}

export const HistoryRecordSetsView = memo(function HistoryRecordSetsView(props: IHistoryRecordSetsProps): JSX.Element {
  const { sets, isNext, units } = props;
  const displayGroups = useMemo(() => {
    const groups = Reps_group(sets, isNext);
    return groups.map((g) => g.map((set) => Reps_setToDisplaySet(set, isNext, units)));
  }, [sets, isNext, units]);
  return (
    <View className="text-sm" style={{ alignItems: "flex-end" }}>
      {displayGroups.map((g, i) => (
        <HistoryRecordSet
          key={i}
          sets={g}
          prs={props.prs}
          isNext={props.isNext}
          showPrDetails={props.showPrDetails}
          units={props.units}
        />
      ))}
    </View>
  );
});

interface IHistoryRecordSet2Props {
  prs?: IHistoryEntryPersonalRecords;
  units: IUnit;
  showPrDetails?: boolean;
  sets: IDisplaySet[];
  isNext: boolean;
}

export const HistoryRecordSet = memo(function HistoryRecordSet(props: IHistoryRecordSet2Props): JSX.Element {
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
      const displayPrSet = Reps_setToDisplaySet(prset, isNext, props.units);
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
  const rem = useRem();
  const sem = Tailwind_semantic();
  const primary = sem.text.primary;
  const secondary = sem.text.secondary;
  const purple = sem.text.purple;
  // `text-orange-400` (in-range reps) has no semantic/stock entry; reuse the project's
  // warning yellow as the closest design-system color.
  const repsColor = isNext
    ? secondary
    : set.isCompleted
      ? sem.text.success
      : set.isInRange
        ? Tailwind_colors().yellow[600]
        : sem.text.error;
  const rpeColor = isNext ? secondary : set.isRpeFailed ? sem.text.error : sem.text.success;
  const timerColor = isNext ? secondary : purple;
  const dataCy = isNext
    ? "history-entry-sets-next"
    : set.isCompleted
      ? "history-entry-sets-completed"
      : set.isInRange
        ? "history-entry-sets-in-range"
        : "history-entry-sets-incompleted";

  const sm = StyledText_remToPx("sm", rem);
  const xs = StyledText_remToPx("xs", rem);
  const builder = new StyledText();
  if (group.length > 1) {
    builder.add(`${group.length}`, { fontWeight: "600", color: purple }, "history-entry-sets");
    builder.add(" \u00D7 ", { color: secondary });
  }
  builder.add(`${set.reps}`, { fontWeight: "600", color: repsColor }, "history-entry-reps");
  if (set.weight) {
    builder.add(" \u00D7 ", { color: secondary });
    builder.add(`${set.weight}`, { fontWeight: "600" }, "history-entry-weight");
    builder.add(set.askWeight ? "+" : "");
    if (set.unit != null) {
      builder.add(`${set.unit}`, { color: secondary }, "history-entry-unit");
    }
  }
  if (set.rpe != null) {
    builder.add(" @", { fontSize: xs, color: rpeColor });
    builder.add(`${set.rpe}`, { color: rpeColor }, "history-entry-rpe");
  }
  if (set.setTimer != null) {
    builder.add(" ");
    if (set.setTimer < 60) {
      builder.add(`${set.setTimer}`, { fontWeight: "600", color: timerColor }, "history-entry-set-timer");
      builder.add("s", { fontSize: xs, color: timerColor });
    } else {
      builder.add(
        TimeUtils_formatMMSS(set.setTimer * 1000),
        { fontWeight: "600", color: timerColor },
        "history-entry-set-timer"
      );
    }
  }
  if (set.timer != null) {
    builder.add(" ");
    builder.add(`${set.timer}`, { color: timerColor }, "history-entry-timer");
    builder.add("s", { fontSize: xs, color: timerColor });
  }
  const built = builder.build();

  return (
    <View className="flex-row items-center" data-testid={dataCy} testID={dataCy}>
      {props.showPrDetails && isPr && (
        <View className="flex-row items-center mr-2">
          <Text className="text-xs font-semibold leading-6 text-yellow-600">{prTypes.join(", ")} </Text>
          <Text className="text-sm leading-6">{"\u{1F3C6}"}</Text>
        </View>
      )}
      <FastText
        text={built.text}
        fragments={built.fragments}
        color={primary}
        fontSize={sm}
        paddingHorizontal={rem / 4}
        backgroundColor={isPr ? sem.color.yellow150 : undefined}
      />
    </View>
  );
});
