import { JSX, useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedState, useTrackedDispatch, untrack } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateTo, navigateToModal } from "../navigation/navigationService";
import { useProgressiveItems } from "../utils/useProgressiveItems";
import { useTimedMemo } from "../utils/useTimedMemo";
import { usePerfRenderCount } from "../utils/usePerfRenderCount";
import { DateUtils_formatYYYYMMDD } from "../utils/date";
import { Thunk_editHistoryRecord } from "../ducks/thunks";
import { IHistoryRecord, ISettings, IStats } from "../types";
import {
  ILiftographSeriesEval,
  LiftographSeriesEval_compile,
  LiftographSeriesEval_create,
} from "../liftograph/liftographSeriesEval";
import { LiftographDashboard_document } from "../liftograph/liftographDashboard";
import { DashboardView } from "./dashboard/dashboardView";
import { Dashboard_current } from "../models/dashboard";
import { IconEdit2 } from "./icons/iconEdit2";

function openDashboards(): void {
  navigateToModal("dashboardsModal");
}

function openEdit(): void {
  navigateTo("dashboardEdit");
}

export function useDashboardEvaluation(args: {
  history: IHistoryRecord[];
  stats: IStats;
  settings: ISettings;
}): ILiftographSeriesEval {
  const { history, stats, settings } = args;
  const today = DateUtils_formatYYYYMMDD(Date.now());
  return useTimedMemo(
    "screenDashboard.evaluation",
    () => LiftographSeriesEval_create({ history, stats, settings, today: Date.now() }),
    [history, stats, settings, today]
  );
}

const navRightButtons = [
  <Pressable key="edit" testID="dashboard-edit" data-testid="dashboard-edit" className="p-2" onPress={openEdit}>
    <IconEdit2 />
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
  const evaluation = useDashboardEvaluation({ history, stats, settings });
  const document = useMemo(
    () => LiftographDashboard_document({ dashboards, currentDashboardId, settings }),
    [dashboards, currentDashboardId, settings]
  );
  const title = `${Dashboard_current({ dashboards, currentDashboardId })?.name ?? "Graphs"} ▾`;
  useNavOptions({ navTitle: title, navRightButtons, navOnTitleClick: openDashboards });

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
          onPress={() => navigateTo("dashboardEdit", { mode: "text" })}
        >
          <Text className="text-xs font-semibold text-text-error">
            {compiled.diagnostics[0].message}
            {compiled.diagnostics.length > 1 ? ` (+${compiled.diagnostics.length - 1} more)` : ""}
          </Text>
        </Pressable>
      ) : null}
      {compiled.layout.length === 0 ? (
        <Text className="py-8 text-center text-text-secondary">This dashboard is empty. Tap the pencil to add graphs.</Text>
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
