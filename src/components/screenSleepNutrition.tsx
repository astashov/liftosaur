import { JSX, useCallback, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { EditStats_setHealthStatHidden } from "../models/editStats";
import { Stats_name } from "../models/stats";
import { ISettings, IStats, IStatsHealthKey, ISubscription, statsHealthDef } from "../types";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { MenuItem } from "./menuItem";
import { IconTrash } from "./icons/iconTrash";
import { IconUndo } from "./icons/iconUndo";
import { DateUtils_format } from "../utils/date";
import { ScrollableTabs } from "./scrollableTabs";
import { GraphStats, getHealthDataForGraph } from "./graphStats";
import { Locker } from "./locker";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";

interface IProps {
  dispatch: IDispatch;
  stats: IStats;
  settings: ISettings;
  subscription: ISubscription;
  navCommon: INavCommon;
}

interface IHealthValue {
  timestamp: number;
  value: number;
}

function unitForMetric(key: IStatsHealthKey): string {
  return key === "sleep" ? "h" : key === "calories" ? "kcal" : "g";
}

function formatHealthValue(key: IStatsHealthKey, value: number): string {
  if (key === "sleep") {
    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  if (key === "calories") {
    return `${Math.round(value)} kcal`;
  }
  return `${value} g`;
}

export function ScreenSleepNutrition(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Sleep & Nutrition" });

  const keysWithData = statsHealthDef.filter((key) => (props.stats.health?.[key] || []).length > 0);

  if (keysWithData.length === 0) {
    return (
      <View className="px-4">
        <Text className="py-16 text-center text-text-secondary">
          No sleep or nutrition data yet. Enable syncing in your Apple Health or Google Health settings, and it will
          appear here as it's imported.
        </Text>
      </View>
    );
  }

  const defaultIndex = Math.max(0, statsHealthDef.indexOf(keysWithData[0]));

  return (
    <ScrollableTabs
      color="purple"
      defaultIndex={defaultIndex}
      tabs={statsHealthDef.map((key) => ({
        label: Stats_name(key),
        children: () => (
          <HealthMetricList
            statsKey={key}
            stats={props.stats}
            settings={props.settings}
            subscription={props.subscription}
            dispatch={props.dispatch}
          />
        ),
      }))}
    />
  );
}

interface IHealthMetricListProps {
  statsKey: IStatsHealthKey;
  stats: IStats;
  settings: ISettings;
  subscription: ISubscription;
  dispatch: IDispatch;
}

function HealthMetricList(props: IHealthMetricListProps): JSX.Element {
  const { statsKey, stats, settings, subscription, dispatch } = props;
  const [showHidden, setShowHidden] = useState(false);
  const all = stats.health?.[statsKey] || [];

  if (all.length === 0) {
    return (
      <View className="px-4">
        <Text className="py-12 text-center text-text-secondary">No {Stats_name(statsKey)} data yet</Text>
      </View>
    );
  }

  const byTimestampDesc = (a: IHealthValue, b: IHealthValue): number => b.timestamp - a.timestamp;
  const visible: IHealthValue[] = all.filter((v) => !v.hidden).map((v) => ({ timestamp: v.timestamp, value: v.value }));
  const hidden: IHealthValue[] = all.filter((v) => v.hidden).map((v) => ({ timestamp: v.timestamp, value: v.value }));
  visible.sort(byTimestampDesc);
  hidden.sort(byTimestampDesc);

  const graphPoints = getHealthDataForGraph(
    all.filter((v) => !v.hidden),
    statsKey
  );

  return (
    <View className="px-4 pb-8">
      <View className="relative">
        {graphPoints.length > 2 && (
          <>
            <GraphStats
              key={statsKey}
              title={null}
              isSameXAxis={false}
              minX={graphPoints[0][0]}
              maxX={graphPoints[graphPoints.length - 1][0]}
              units={unitForMetric(statsKey)}
              settings={settings}
              collection={graphPoints}
              statsKey={statsKey}
              isInteractive={Subscriptions_hasSubscription(subscription)}
            />
            <Locker topic="Graphs" dispatch={dispatch} blur={8} subscription={subscription} />
          </>
        )}
      </View>
      {visible.length === 0 ? (
        <Text className="py-8 text-center text-text-secondary">All {Stats_name(statsKey)} records are hidden</Text>
      ) : (
        visible.map((value) => (
          <HealthMetricRow
            key={`${statsKey}-${value.timestamp}`}
            statsKey={statsKey}
            value={value}
            isHidden={false}
            dispatch={dispatch}
          />
        ))
      )}
      {hidden.length > 0 && (
        <>
          <Pressable
            className="py-3"
            data-testid="toggle-hidden-health"
            testID="toggle-hidden-health"
            onPress={() => setShowHidden((s) => !s)}
          >
            <Text className="text-center text-text-link">
              {showHidden ? "Hide" : "Show"} {hidden.length} hidden {hidden.length === 1 ? "record" : "records"}
            </Text>
          </Pressable>
          {showHidden &&
            hidden.map((value) => (
              <HealthMetricRow
                key={`${statsKey}-hidden-${value.timestamp}`}
                statsKey={statsKey}
                value={value}
                isHidden={true}
                dispatch={dispatch}
              />
            ))}
        </>
      )}
    </View>
  );
}

interface IHealthMetricRowProps {
  statsKey: IStatsHealthKey;
  value: IHealthValue;
  isHidden: boolean;
  dispatch: IDispatch;
}

function HealthMetricRow(props: IHealthMetricRowProps): JSX.Element {
  const { statsKey, value, isHidden, dispatch } = props;

  const onToggle = useCallback(() => {
    EditStats_setHealthStatHidden(dispatch, statsKey, value.timestamp, !isHidden);
  }, [dispatch, statsKey, value.timestamp, isHidden]);

  const valueNode = (
    <View className="flex-row items-center">
      <Text className={`font-semibold ${isHidden ? "text-text-secondary" : "text-text-primary"}`}>
        {formatHealthValue(statsKey, value.value)}
      </Text>
      <Pressable
        className={isHidden ? "p-3 nm-unhide-health-stat" : "p-3 nm-hide-health-stat"}
        data-testid={isHidden ? "unhide-health-stat" : "hide-health-stat"}
        testID={isHidden ? "unhide-health-stat" : "hide-health-stat"}
        onPress={onToggle}
      >
        {isHidden ? <IconUndo /> : <IconTrash />}
      </Pressable>
    </View>
  );

  return <MenuItem name={DateUtils_format(value.timestamp)} value={valueNode} />;
}
