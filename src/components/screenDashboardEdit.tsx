import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./primitives/text";
import { useTrackedState, useTrackedDispatch, untrack } from "../navigation/TrackedStateContext";
import { useNavOptions } from "../navigation/useNavOptions";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { UidFactory_generateUid } from "../utils/generator";
import { IDispatch } from "../ducks/types";
import { IStorage } from "../types";
import { ILiftographDashboardDocument, LiftographDashboard_document } from "../liftograph/liftographDashboard";
import { LiftographEditorAnalysis } from "../liftograph/liftographEditorAnalysis";
import { DashboardEditView } from "./dashboard/dashboardEditView";
import { DashboardEditStrip, IDashboardEditMode } from "./dashboard/dashboardEditStrip";
import { DashboardTextEditor } from "./dashboard/dashboardTextEditor";
import { useDashboardDraft } from "./dashboard/useDashboardDraft";
import { useDashboardEvaluation } from "./dashboard/dashboardEvaluation";
import {
  DashboardEditorSave_confirmAsNew,
  DashboardEditorSave_decide,
  DashboardEditorSave_isDirty,
  DashboardEditorSave_session,
} from "../models/dashboardEditorSave";
import { DashboardEditorWrite_apply } from "../models/dashboardEditorWrite";
import { DashboardWidgetCommit_resolve } from "../models/dashboardWidgetCommit";
import { useModal } from "../navigation/ModalStateContext";

const DISCARD_MESSAGE = "Discard unsaved changes to this dashboard?";

async function saveDraft(
  dispatch: IDispatch,
  storage: Pick<IStorage, "dashboards" | "currentDashboardId">,
  document: ILiftographDashboardDocument,
  text: string
): Promise<boolean> {
  const decision = DashboardEditorSave_decide(storage, DashboardEditorSave_session(document), text);
  if (decision.kind === "alert") {
    Dialog_alert(decision.message);
    return false;
  }
  if (decision.kind !== "askSaveAsNew") {
    DashboardEditorWrite_apply(dispatch, decision);
    return true;
  }
  if (!(await Dialog_confirm("This dashboard was deleted on another device. Save it as a new dashboard?"))) {
    return false;
  }
  const asNew = DashboardEditorSave_confirmAsNew(storage, text, UidFactory_generateUid(8));
  if (asNew.kind === "alert") {
    Dialog_alert(asNew.message);
    return false;
  }
  DashboardEditorWrite_apply(dispatch, asNew);
  return true;
}

export function ScreenDashboardEdit(props: { mode?: IDashboardEditMode; caret?: number }): JSX.Element {
  const navigation = useNavigation();
  const trackedState = useTrackedState();
  const dispatch = useTrackedDispatch();
  const settings = untrack(trackedState.storage.settings);
  const history = untrack(trackedState.storage.history);
  const dashboards = untrack(trackedState.storage.dashboards);
  const currentDashboardId = untrack(trackedState.storage.currentDashboardId);
  const evaluation = useDashboardEvaluation();
  const [opened] = useState(() => LiftographDashboard_document({ dashboards, currentDashboardId, settings }));
  const draft = useDashboardDraft(opened.text);
  const [mode, setMode] = useState<IDashboardEditMode>(props.mode ?? "ui");
  const [caret, setCaret] = useState(props.caret);
  const [analysis] = useState(() => new LiftographEditorAnalysis(settings));
  const [diagnosticsAnalysis] = useState(() => new LiftographEditorAnalysis(settings));
  const diagnostics = useMemo(() => diagnosticsAnalysis.compileDiagnostics(draft.text), [draft.text, settings]);
  const isDirty = DashboardEditorSave_isDirty(DashboardEditorSave_session(opened), draft.text);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    analysis.setSettings(settings);
    diagnosticsAnalysis.setSettings(settings);
  }, [settings]);
  useEffect(() => {
    analysis.setHistory(history);
  }, [history]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !isDirty });
  }, [navigation, isDirty]);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current || !isDirtyRef.current) {
        return;
      }
      e.preventDefault();
      Dialog_confirm(DISCARD_MESSAGE).then((confirmed) => {
        if (confirmed) {
          allowLeaveRef.current = true;
          navigation.dispatch(e.data.action);
        }
      });
    });
  }, [navigation]);

  const save = async (): Promise<void> => {
    if (isDirty && !(await saveDraft(dispatch, { dashboards, currentDashboardId }, opened, draft.text))) {
      return;
    }
    allowLeaveRef.current = true;
    navigation.goBack();
  };
  const openWidget = useModal("dashboardWidgetModal", (result) => {
    const resolved = DashboardWidgetCommit_resolve(draft.text, result);
    if (resolved.kind === "alert") {
      Dialog_alert(resolved.message);
    } else if (resolved.kind === "write") {
      draft.setText(resolved.text);
    }
  });

  const saveRef = useRef(save);
  saveRef.current = save;
  const navRightButtons = useMemo(
    () => [
      <Pressable
        key="save"
        testID="dashboard-edit-save"
        data-testid="dashboard-edit-save"
        className="p-2"
        onPress={() => saveRef.current()}
      >
        <Text className="text-base font-semibold text-text-purple">Save</Text>
      </Pressable>,
    ],
    []
  );
  useNavOptions({ navTitle: "Edit dashboard", navRightButtons });

  const strip = (
    <DashboardEditStrip
      mode={mode}
      canUndo={draft.canUndo}
      canRedo={draft.canRedo}
      onUndo={draft.undo}
      onRedo={draft.redo}
      onMode={(next) => {
        setCaret(undefined);
        setMode(next);
      }}
    />
  );

  if (mode === "text") {
    return (
      <DashboardTextEditor
        header={strip}
        text={draft.text}
        initialCaret={caret}
        analysis={analysis}
        diagnostics={diagnostics}
        onChange={draft.setText}
      />
    );
  }
  return (
    <NavScreenContent stickyHeaderIndices={[0]}>
      {strip}
      <View className="px-4 pt-2 pb-8">
        <DashboardEditView
          text={draft.text}
          evaluation={evaluation}
          onChange={draft.setText}
          onOpenEditor={(at) => {
            setCaret(at);
            setMode("text");
          }}
          onOpenWidget={openWidget}
        />
      </View>
    </NavScreenContent>
  );
}
