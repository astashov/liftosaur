import { JSX, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Path, Svg } from "../primitives/svg";
import { ILiftographWidget } from "../../liftograph/liftographCompile";
import { LiftographEngine_evaluateWidget } from "../../liftograph/liftographEngine";
import { ILiftographSeriesEval } from "../../liftograph/liftographSeriesEval";
import { LiftographValueView_format, LiftographValueView_path } from "../../liftograph/liftographValueView";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { DashboardCard } from "./dashboardCard";
import { DashboardNotice } from "./dashboardNotice";

const SPARKLINE_HEIGHT = 22;

export function DashboardValue(props: {
  widget: Extract<ILiftographWidget, { kind: "value" }>;
  evaluation: ILiftographSeriesEval;
}): JSX.Element {
  const { widget, evaluation } = props;
  const [width, setWidth] = useState(0);
  const result = useMemo(() => LiftographEngine_evaluateWidget(widget, evaluation), [widget, evaluation]);
  if (result.type !== "value") {
    return <DashboardNotice caption={widget.caption} message="This value can't be shown" isError />;
  }
  if (result.error != null) {
    return <DashboardNotice caption={widget.caption} message={result.error.message} isError />;
  }
  const view = LiftographValueView_format(widget, result, evaluation.input.settings);
  const changeColor =
    view.change?.tone === "good"
      ? "text-text-success"
      : view.change?.tone === "bad"
        ? "text-text-error"
        : "text-text-secondary";
  const arrow = view.change?.direction === "up" ? "▲ " : view.change?.direction === "down" ? "▼ " : "= ";
  return (
    <DashboardCard caption={widget.caption} testID="dashboard-value">
      {widget.series.name != null ? (
        <Text className="text-xs text-text-secondary" numberOfLines={1}>
          {widget.series.name}
        </Text>
      ) : null}
      <View className="flex-row items-baseline">
        <Text className="text-2xl font-semibold">{view.number}</Text>
        {view.unit != null ? <Text className="ml-1 text-xs text-text-secondary">{view.unit}</Text> : null}
      </View>
      <View className="flex-row flex-wrap items-baseline">
        {view.change != null ? (
          <Text className={`text-xs font-semibold ${changeColor}`}>
            {arrow}
            {view.change.text}
          </Text>
        ) : null}
        {view.changeLabel !== "" ? (
          <Text className="ml-1 text-xs text-text-secondarysubtle">{view.changeLabel}</Text>
        ) : null}
      </View>
      {view.trend != null ? (
        <View
          className="mt-2"
          style={{ height: SPARKLINE_HEIGHT }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {width > 0 ? (
            <Svg width={width} height={SPARKLINE_HEIGHT}>
              <Path
                d={LiftographValueView_path(view.trend, width, SPARKLINE_HEIGHT)}
                stroke={Tailwind_semantic().graph.purple}
                strokeWidth={1.5}
                fill="none"
              />
            </Svg>
          ) : null}
        </View>
      ) : null}
    </DashboardCard>
  );
}
