import { JSX, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { ILiftographWidget } from "../../liftograph/liftographCompile";
import { LiftographEngine_evaluateWidget } from "../../liftograph/liftographEngine";
import { ILiftographSeriesEval } from "../../liftograph/liftographSeriesEval";
import {
  LiftographMuscles_layout,
  LiftographMuscles_sections,
  LiftographMuscles_summary,
} from "../../liftograph/liftographMuscles";
import { PlannerWeekMuscles } from "../../pages/planner/components/plannerWeekMuscles";
import { MuscleGroupSetsList } from "../muscleGroupSets";
import { DashboardCard } from "./dashboardCard";
import { DashboardNotice } from "./dashboardNotice";

const MAP_MAX_WIDTH = 240;

export function DashboardMuscles(props: {
  widget: Extract<ILiftographWidget, { kind: "muscles" }>;
  evaluation: ILiftographSeriesEval;
}): JSX.Element {
  const { widget, evaluation } = props;
  const [width, setWidth] = useState(0);
  const result = useMemo(() => LiftographEngine_evaluateWidget(widget, evaluation), [widget, evaluation]);
  if (result.type !== "muscles") {
    return <DashboardNotice caption={widget.caption} message="These muscles can't be shown" isError />;
  }
  const { muscles } = result;
  const settings = evaluation.input.settings;
  const layout = LiftographMuscles_layout(widget, width);
  const summary = layout.showSummary ? LiftographMuscles_summary(widget, muscles, settings) : undefined;
  return (
    <DashboardCard caption={widget.caption} testID="dashboard-muscles">
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <Text className="mb-2 text-xs text-text-secondary">Sets per week</Text>
        <View className={layout.isSideBySide ? "flex-row gap-3" : ""}>
          {layout.showMap ? (
            <View className={layout.isSideBySide ? "w-2/5" : "self-center w-full"} style={{ maxWidth: MAP_MAX_WIDTH }}>
              <PlannerWeekMuscles
                settings={settings}
                data={muscles.muscleGroup}
                ungroupedMuscleSets={muscles.ungroupedSets}
              />
              {summary != null ? (
                <View className="mt-2">
                  <Text className="text-sm font-semibold">{summary.title}</Text>
                  {summary.detail != null ? (
                    <Text className="text-xs text-text-secondary">{summary.detail}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
          {layout.showList ? (
            <View className={layout.isSideBySide ? "flex-1" : layout.showMap ? "mt-3" : ""}>
              <MuscleGroupSetsList
                sections={LiftographMuscles_sections(widget, muscles, settings)}
                settings={settings}
              />
            </View>
          ) : null}
        </View>
      </View>
    </DashboardCard>
  );
}
