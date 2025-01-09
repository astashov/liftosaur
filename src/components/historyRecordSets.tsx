import { View } from "react-native";
import { ProgramSet } from "../models/programSet";
import { Reps } from "../models/set";
import { Weight } from "../models/weight";
import { IProgramSet, ISet, ISettings } from "../types";
import { CollectionUtils } from "../utils/collection";
import { LftText } from "./lftText";

export interface IDisplaySet {
  dimReps?: boolean;
  dimRpe?: boolean;
  dimWeight?: boolean;
  dimTimer?: boolean;
  reps: string;
  weight: string;
  rpe?: string;
  askWeight?: boolean;
  unit?: string;
  completedRpe?: string;
  isCompleted?: boolean;
  isInRange?: boolean;
  timer?: number;
}

export function groupDisplaySets(displaySets: IDisplaySet[]): IDisplaySet[][] {
  return CollectionUtils.groupBy(displaySets, (last, set) => {
    return (
      last.reps !== set.reps ||
      last.rpe !== set.rpe ||
      last.weight !== set.weight ||
      last.askWeight !== set.askWeight ||
      last.timer !== set.timer
    );
  });
}

export function HistoryRecordSetsView(props: {
  sets: ISet[];
  isNext: boolean;
  noWrap?: boolean;
  settings: ISettings;
}): JSX.Element {
  const { sets, isNext } = props;
  const groups = Reps.group(sets, isNext);
  const displayGroups = groups.map((g) => {
    return g.map((set) => {
      return {
        reps: isNext ? Reps.displayReps(set) : Reps.displayCompletedReps(set),
        rpe: set.rpe?.toString(),
        completedRpe: set.completedRpe?.toString(),
        weight: Weight.display(set.weight, false),
        unit: set.weight.value > 0 ? set.weight.unit : undefined,
        askWeight: set.askWeight,
        isCompleted: Reps.isCompletedSet(set),
        isInRange: set.minReps != null ? set.completedReps != null && set.completedReps >= set.minReps : undefined,
      };
    });
  });
  const hasRpe = displayGroups.some((group) => group.some((set) => set.rpe || set.completedRpe));
  return (
    <View className={`flex-row ${props.noWrap ? "" : "flex-wrap"}`}>
      {displayGroups.map((g, i) => (
        <HistoryRecordSet key={i} sets={g} isNext={props.isNext} hasRpe={hasRpe} />
      ))}
    </View>
  );
}

export function HistoryRecordProgramSetsView(props: { sets: IProgramSet[] }): JSX.Element {
  const { sets } = props;
  const groups = ProgramSet.group(sets);
  const displayGroups = groups.map((g) => {
    return g.map((set) => {
      const reps = set.minRepsExpr ? `${set.minRepsExpr}-${set.repsExpr}` : `${set.repsExpr}`;
      return {
        reps: set.isAmrap ? `${reps}+` : `${reps}`,
        weight: set.weightExpr,
        isCompleted: true,
      };
    });
  });
  return (
    <View className="flex-row flex-wrap">
      {displayGroups.map((g, i) => (
        <HistoryRecordSet key={i} sets={g} isNext={true} />
      ))}
    </View>
  );
}

export function HistoryRecordSet(props: { sets: IDisplaySet[]; isNext: boolean; hasRpe?: boolean }): JSX.Element {
  const { sets, isNext } = props;
  if (sets.length === 0) {
    return <View />;
  }
  const set = sets[0];
  const length = sets.length;
  const color = isNext
    ? "text-grayv2-main"
    : set.isCompleted
    ? "text-greenv2-main"
    : set.isInRange
    ? "text-orange-400"
    : "text-redv2-main";
  const rpeClassName = `relative text-xs leading-none text-center ${set.dimRpe ? "opacity-50" : ""}`;
  const rpeStyles = { right: 0, top: 0 };
  return (
    <View className="flex-row items-center py-2 mr-2 leading-none">
      <View className="relative text-center">
        {set.completedRpe != null ? (
          <LftText
            data-cy="history-entry-completed-rpe"
            className={`${rpeClassName}`}
            style={{ ...rpeStyles, color: "#d1720c" }}
          >
            @{set.completedRpe}
          </LftText>
        ) : set.completedRpe == null && set.rpe != null ? (
          <LftText data-cy="history-entry-rpe" className={`${rpeClassName} text-grayv2-main`} style={rpeStyles}>
            @{set.rpe}
          </LftText>
        ) : props.hasRpe ? (
          <LftText className={rpeClassName} style={rpeStyles}>
            &nbsp;
          </LftText>
        ) : undefined}
        <View
          data-cy={
            isNext
              ? "history-entry-sets-next"
              : set.isCompleted
              ? "history-entry-sets-completed"
              : set.isInRange
              ? "history-entry-sets-in-range"
              : "history-entry-sets-incompleted"
          }
          className="flex flex-row items-baseline border-b border-grayv2-200"
        >
          <LftText className={`font-bold text-sm text-purplev2-main ${set.dimReps ? "opacity-50" : ""}`}>
            {length > 1 && <>{length}x</>}
          </LftText>
          <LftText className={`${color} font-bold text-lg ${set.dimReps ? "opacity-50" : ""}`}>{set.reps}</LftText>
        </View>
        <View
          data-cy="history-entry-weight"
          className={`pt-1 flex-row flex items-baseline ${set.dimWeight ? "opacity-50" : ""}`}
        >
          <LftText>
            <LftText className="text-sm font-bold text-grayv2-main">{set.weight}</LftText>
            <LftText className="text-sm font-bold text-grayv2-main">{set.askWeight ? "+" : ""}</LftText>
            {set.unit && (
              <LftText className="font-normal text-grayv2-main" style={{ fontSize: 11 }}>
                {set.unit}
              </LftText>
            )}
          </LftText>
        </View>
      </View>
      {set.timer != null && (
        <View
          className={`flex-row items-center text-xs font-bold text-grayv2-main ${set.dimTimer ? "opacity-50" : ""}`}
        >
          <LftText>{set.timer}s</LftText>
        </View>
      )}
    </View>
  );
}
