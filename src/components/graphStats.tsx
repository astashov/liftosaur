import { Length } from "../models/length";
import { Weight } from "../models/weight";
import {
  ILengthUnit,
  ISettings,
  IStatsKey,
  IStatsLengthValue,
  IStatsPercentageValue,
  IStatsWeightValue,
  IUnit,
} from "../types";
import { IPercentageUnit } from "../types";
import { View } from "react-native";
import { CartesianChart, Line, useChartPressState } from "victory-native";
import { CollectionUtils } from "../utils/collection";
import { Circle, useFont } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import poppins from "../../fonts/poppins_regular.ttf";

interface IGraphStatsProps {
  collection: [number, number][];
  units: IUnit | ILengthUnit | IPercentageUnit;
  statsKey: IStatsKey;
  settings: ISettings;
  title?: string | null;
  isSameXAxis?: boolean;
  minX: number;
  maxX: number;
  movingAverageWindowSize?: number;
}

export function getWeightDataForGraph(coll: IStatsWeightValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils.sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, Weight.convertTo(i.value, settings.units).value];
  });
}

export function getLengthDataForGraph(coll: IStatsLengthValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils.sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, Length.convertTo(i.value, settings.lengthUnits).value];
  });
}

export function getPercentageDataForGraph(coll: IStatsPercentageValue[], settings: ISettings): [number, number][] {
  const sortedCollection = CollectionUtils.sort(coll, (a, b) => a.timestamp - b.timestamp);
  return sortedCollection.map((i) => {
    return [i.timestamp / 1000, i.value.value];
  });
}

export function GraphStats(props: IGraphStatsProps): JSX.Element {
  const data = props.collection.map(([x, y]) => ({ x, y }));
  const font = useFont(poppins, 12);
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });

  return (
    <View style={{ height: 300 }}>
      <CartesianChart data={data} xKey="x" yKeys={["y"]} axisOptions={{ font }} chartPressState={state}>
        {({ points }) => (
          <>
            <Line points={points.y} color="red" strokeWidth={1} />
            {isActive && <ToolTip x={state.x.position} y={state.y.y.position} />}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

function ToolTip({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }): JSX.Element {
  return <Circle cx={x} cy={y} r={4} color="black" />;
}
