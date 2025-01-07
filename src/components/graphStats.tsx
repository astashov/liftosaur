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
import { Text, View } from "react-native";
import { CartesianChart, Line, useChartPressState, useChartTransformState } from "victory-native";
import { CollectionUtils } from "../utils/collection";
import { Circle, useFont } from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import poppins from "../../fonts/poppins_regular.ttf";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import { DateUtils } from "../utils/date";
import AnimateableText from "react-native-animateable-text";

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
  const data = props.collection.map(([x, y]) => ({ x: x * 1000, y }));
  const font = useFont(poppins, 12);
  const lastDataPoint = data[data.length - 1];
  const { state, isActive } = useChartPressState({ x: lastDataPoint?.x ?? 0, y: { y: lastDataPoint?.y ?? 0 } });
  const transformState = useChartTransformState({
    scaleX: 1.0,
    scaleY: 1.0,
  });
  const animatedPropsDate = useAnimatedProps(() => ({ text: `${DateUtils.format(state.x.value.value)}` }));
  const animatedPropsValue = useAnimatedProps(() => ({ text: `${state.y.y.value.value}` }));

  return (
    <View style={{ height: 300 }}>
      <CartesianChart
        transformState={transformState.state}
        transformConfig={{
          pan: {
            minPointers: 2,
            dimensions: ["x"],
            activateAfterLongPress: 300,
          },
          pinch: {
            dimensions: ["x"],
          },
        }}
        data={data}
        xKey="x"
        yKeys={["y"]}
        domainPadding={{ left: 12, right: 12, top: 12, bottom: 12 }}
        padding={{ left: 12, right: 12, top: 12, bottom: 12 }}
        xAxis={{
          font,
          formatXLabel: (x) => {
            return DateUtils.format(x, true, true);
          },
        }}
        yAxis={[{ font }]}
        chartPressState={state}
        chartPressConfig={{
          pan: {
            activeOffsetX: 10,
          },
        }}
      >
        {({ points }) => (
          <>
            <Line points={points.y} color="red" strokeWidth={1} />
            {isActive && <ToolTip x={state.x.position} y={state.y.y.position} />}
          </>
        )}
      </CartesianChart>
      <View className="flex flex-row justify-center mb-2">
        <AnimateableText animatedProps={animatedPropsDate} />
        <Text>, </Text>
        <AnimateableText style={{ fontWeight: "bold" }} animatedProps={animatedPropsValue} />
        <Text> {props.units}</Text>
      </View>
    </View>
  );
}

function ToolTip({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }): JSX.Element {
  return <Circle cx={x} cy={y} r={4} color="black" />;
}
