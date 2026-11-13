import { JSX, useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedState, useTrackedDispatch, untrack } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateTo, navigateToModal } from "../navigation/navigationService";
import { useProgressiveItems } from "../utils/useProgressiveItems";
import { useTimedMemo } from "../utils/useTimedMemo";
import { usePerfRenderCount } from "../utils/usePerfRenderCount";
import { Thunk_editHistoryRecord } from "../ducks/thunks";
import { LiftographSeriesEval_compile } from "../liftograph/liftographSeriesEval";
import { useDashboardEvaluation } from "./dashboard/dashboardEvaluation";
import { LiftographDashboard_document } from "../liftograph/liftographDashboard";
import { DashboardView } from "./dashboard/dashboardView";
import { Dashboard_current } from "../models/dashboard";
import { IconEdit2 } from "./icons/iconEdit2";
import { Button } from "./button";
import { DashboardStarter_isOffered, DashboardStarter_lifts, DashboardStarter_text } from "../models/dashboardStarter";
import { DashboardEditorSave_decide, DashboardEditorSave_session } from "../models/dashboardEditorSave";
import { DashboardEditorWrite_apply } from "../models/dashboardEditorWrite";
import { Program_getEvaluatedProgramFromState } from "../models/program";
import { IState } from "../models/state";
import { IDispatch } from "../ducks/types";
import { ILiftographDashboardDocument } from "../liftograph/liftographDashboard";

function generateStarter(dispatch: IDispatch, state: IState, document: ILiftographDashboardDocument): void {
  const storage = state.storage;
  const lifts = DashboardStarter_lifts(
    storage.history,
    () => Program_getEvaluatedProgramFromState(state),
    storage.settings,
    Date.now()
  );
  const text = DashboardStarter_text(lifts, storage.settings);
  DashboardEditorWrite_apply(
    dispatch,
    DashboardEditorSave_decide(storage, DashboardEditorSave_session(document), text)
  );
}

function openDashboards(): void {
  navigateToModal("dashboardsModal");
}

function openEdit(): void {
  navigateTo("dashboardEdit");
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
  const dashboards = untrack(trackedState.storage.dashboards);
  const currentDashboardId = untrack(trackedState.storage.currentDashboardId);
  const evaluation = useDashboardEvaluation();
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
      {DashboardStarter_isOffered(dashboards, compiled.layout.length) ? (
        <View className="items-center px-4 py-8">
          <Text className="pb-4 text-lg font-bold text-center">Your dashboard is empty</Text>
          <Button
            name="dashboard-generate-starter"
            kind="purple"
            onClick={() => {
              generateStarter(dispatch, untrack(trackedState), document);
            }}
          >
            Generate my first dashboard
          </Button>
          <Text className="pt-3 text-sm text-center text-text-secondary">
            Adds your most-trained lifts, a muscle map, a workout calendar and your bodyweight. You can change all of it
            later.
          </Text>
          <Text className="pt-4 text-sm text-center text-text-secondary">
            Or tap the pencil to add widgets one by one.
          </Text>
        </View>
      ) : compiled.layout.length === 0 ? (
        <Text className="py-8 text-center text-text-secondary">
          This dashboard is empty. Tap the pencil to add graphs.
        </Text>
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
