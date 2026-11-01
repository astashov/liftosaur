import { JSX, useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedState, useTrackedDispatch, untrack } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateToModal } from "../navigation/navigationService";
import { useProgressiveItems } from "../utils/useProgressiveItems";
import { useTimedMemo } from "../utils/useTimedMemo";
import { usePerfRenderCount } from "../utils/usePerfRenderCount";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import { Thunk_editHistoryRecord } from "../ducks/thunks";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../liftograph/liftographSeriesEval";
import { LiftographDashboard_document } from "../liftograph/liftographDashboard";
import { DashboardView } from "./dashboard/dashboardView";

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

export function ScreenDashboard(): JSX.Element {
  usePerfRenderCount("ScreenDashboard");
  const trackedState = useTrackedState();
  const dispatch = useTrackedDispatch();
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
  const rows = useProgressiveItems(compiled.layout, {
    initialBatch: 3,
    batchSize: 2,
    idleCap: 6,
    debugLabel: "Dashboard",
    resetKey: document.text,
  });

  return (
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
      <DashboardView
        layout={rows}
        text={document.text}
        evaluation={evaluation}
        onOpenRecord={(record) => dispatch(Thunk_editHistoryRecord(record))}
      />
    </View>
  );
}
