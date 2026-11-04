import { JSX, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Path, Svg } from "../primitives/svg";
import { ILiftographWidget } from "../../liftograph/liftographCompile";
import { LiftographEngine_evaluateWidget } from "../../liftograph/liftographEngine";
import { ILiftographSeriesEval } from "../../liftograph/liftographSeriesEval";
import {
  LiftographCalendar_footer,
  LiftographCalendar_layout,
  LiftographCalendar_paths,
} from "../../liftograph/liftographCalendar";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { DashboardCard } from "./dashboardCard";
import { DashboardNotice } from "./dashboardNotice";

const OUTLINE = 1.5;

export function DashboardCalendar(props: {
  widget: Extract<ILiftographWidget, { kind: "calendar" }>;
  evaluation: ILiftographSeriesEval;
}): JSX.Element {
  const { widget, evaluation } = props;
  const [width, setWidth] = useState(0);
  const result = useMemo(() => LiftographEngine_evaluateWidget(widget, evaluation), [widget, evaluation]);
  const layout = useMemo(
    () =>
      result.type === "calendar"
        ? LiftographCalendar_layout(result.calendar, Math.max(0, width - 2 * OUTLINE))
        : undefined,
    [result, width]
  );
  if (result.type !== "calendar" || layout == null) {
    return <DashboardNotice caption={widget.caption} message="This calendar can't be shown" isError />;
  }
  const paths = LiftographCalendar_paths(layout);
  const semantic = Tailwind_semantic();
  const step = layout.cell + layout.gap;
  return (
    <DashboardCard caption={widget.caption} testID="dashboard-calendar">
      <View className="flex-row items-baseline mb-2">
        <Text className="text-2xl font-semibold">{result.calendar.streakWeeks}</Text>
        <Text className="ml-1 text-sm text-text-secondary">week streak</Text>
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <View className="h-4">
          {layout.months.map((month) => (
            <Text
              key={month.column}
              className="absolute text-xs text-text-secondary"
              style={{ left: OUTLINE + month.column * step }}
              numberOfLines={1}
            >
              {month.label}
            </Text>
          ))}
        </View>
        {layout.width > 0 ? (
          <Svg
            width={layout.width + 2 * OUTLINE}
            height={layout.height + 2 * OUTLINE}
            viewBox={`${-OUTLINE} ${-OUTLINE} ${layout.width + 2 * OUTLINE} ${layout.height + 2 * OUTLINE}`}
          >
            <Path d={paths.none} fill={semantic.border.neutral} />
            <Path d={paths.done} fill={semantic.graph.purple} />
            {paths.today != null ? (
              <Path d={paths.today} fill="none" stroke={semantic.text.primary} strokeWidth={OUTLINE} />
            ) : null}
          </Svg>
        ) : null}
      </View>
      <Text className="mt-2 text-xs text-text-secondary">
        {LiftographCalendar_footer(result.calendar, widget.range)}
      </Text>
    </DashboardCard>
  );
}
