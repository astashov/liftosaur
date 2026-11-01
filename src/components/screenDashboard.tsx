import { JSX, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Markdown } from "./markdown";
import { ActiveGraphContext, IActiveGraphContext } from "./activeGraphContext";
import { useTrackedState, untrack } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateToModal } from "../navigation/navigationService";
import { useProgressiveItems } from "../utils/useProgressiveItems";
import { useTimedMemo } from "../utils/useTimedMemo";
import { usePerfRenderCount } from "../utils/usePerfRenderCount";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import { ILiftographWidget } from "../liftograph/liftographCompile";
import {
  LiftographSeriesEval_compile,
  LiftographSeriesEval_create,
  ILiftographSeriesEval,
} from "../liftograph/liftographSeriesEval";
import {
  LiftographDashboard_document,
  LiftographDashboard_isHeading,
  LiftographDashboard_widgetKey,
} from "../liftograph/liftographDashboard";
import { DashboardGraph } from "./dashboard/dashboardGraph";
import { DashboardValue } from "./dashboard/dashboardValue";
import { DashboardNotice } from "./dashboard/dashboardNotice";
import { DashboardCard } from "./dashboard/dashboardCard";

const navRightButtons = [
  <Pressable
    key="edit"
    testID="dashboard-edit"
    data-testid="dashboard-edit"
    className="p-2"
    onPress={() => navigateToModal("dashboardEditorModal")}
  >
    <Text className="text-base font-semibold text-text-purple">Edit</Text>
  </Pressable>,
];

function DashboardWidget(props: {
  id: string;
  widget: ILiftographWidget;
  evaluation: ILiftographSeriesEval;
}): JSX.Element | null {
  const { widget, evaluation } = props;
  if (widget.kind === "graph") {
    return <DashboardGraph id={props.id} widget={widget} evaluation={evaluation} />;
  } else if (widget.kind === "value") {
    return <DashboardValue widget={widget} evaluation={evaluation} />;
  } else if (widget.kind === "text") {
    if (LiftographDashboard_isHeading(widget.markdown)) {
      return <Markdown value={widget.markdown} className="flex-1 mt-2" />;
    }
    return (
      <DashboardCard caption={widget.caption}>
        <Markdown value={widget.markdown} />
      </DashboardCard>
    );
  } else if (widget.kind === "error") {
    return <DashboardNotice caption={widget.caption} message={widget.message} isError />;
  } else if (widget.kind === "unsupported") {
    return <DashboardNotice caption={widget.caption} message="This widget needs a newer version of Liftosaur." />;
  }
  return <DashboardNotice caption={widget.caption} message={`The ${widget.kind} widget is coming soon.`} />;
}

export function ScreenDashboard(): JSX.Element {
  usePerfRenderCount("ScreenDashboard");
  const trackedState = useTrackedState();
  const settings = untrack(trackedState.storage.settings);
  const stats = untrack(trackedState.storage.stats);
  const history = untrack(trackedState.storage.history);
  const dashboards = untrack(trackedState.storage.dashboards);
  const currentDashboardId = untrack(trackedState.storage.currentDashboardId);
  const today = DateUtils_formatYYYYMMDD(Date.now());

  useNavOptions({ navTitle: "Graphs", navHelpKey: "graphs", navRightButtons });

  const evaluation = useTimedMemo(
    "screenDashboard.evaluation",
    () => LiftographSeriesEval_create({ history, stats, settings, today: Date.now() }),
    [history, stats, settings, today]
  );
  const document = useMemo(
    () => LiftographDashboard_document({ dashboards, currentDashboardId, settings }),
    [dashboards, currentDashboardId, settings]
  );
  const compiled = useTimedMemo(
    "screenDashboard.compile",
    () => LiftographSeriesEval_compile(evaluation, document.text),
    [evaluation, document.text]
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeGraphValue = useMemo<IActiveGraphContext>(() => ({ activeId, setActive: setActiveId }), [activeId]);
  const rows = useProgressiveItems(compiled.layout, {
    initialBatch: 3,
    batchSize: 2,
    idleCap: 6,
    debugLabel: "Dashboard",
    resetKey: document.text,
  });

  return (
    <ActiveGraphContext.Provider value={activeGraphValue}>
      <View className="px-4 pt-4 pb-8">
        {compiled.diagnostics.length > 0 ? (
          <Pressable
            testID="dashboard-problems"
            className="px-3 py-2 mb-3 rounded-lg bg-background-lighterror"
            onPress={() => navigateToModal("dashboardEditorModal")}
          >
            <Text className="text-xs font-semibold text-text-error">
              {compiled.diagnostics[0].message}
              {compiled.diagnostics.length > 1 ? ` (+${compiled.diagnostics.length - 1} more)` : ""}
            </Text>
          </Pressable>
        ) : null}
        {compiled.layout.length === 0 ? (
          <Text className="py-8 text-center text-text-secondary">This dashboard is empty. Tap Edit to add graphs.</Text>
        ) : null}
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} className="mb-2">
            {row.caption != null ? <Markdown value={row.caption} className="mb-1" /> : null}
            <View className="flex-row gap-2">
              {row.items.map((widget, itemIndex) => {
                const key = LiftographDashboard_widgetKey(
                  rowIndex,
                  itemIndex,
                  document.text.slice(widget.span.from, widget.span.to)
                );
                return <DashboardWidget key={key} id={key} widget={widget} evaluation={evaluation} />;
              })}
            </View>
          </View>
        ))}
      </View>
    </ActiveGraphContext.Provider>
  );
}
