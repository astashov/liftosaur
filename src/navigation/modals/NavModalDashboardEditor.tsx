import { JSX, useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import { IState, updateState } from "../../models/state";
import { Dialog_alert, Dialog_confirm } from "../../utils/dialog";
import { UidFactory_generateUid } from "../../utils/generator";
import { LiftographDashboard_document } from "../../liftograph/liftographDashboard";
import { LiftographEditorAnalysis } from "../../liftograph/liftographEditorAnalysis";
import { ILiftographDiagnostic } from "../../liftograph/liftographDocument";
import {
  DashboardEditorSave_confirmAsNew,
  DashboardEditorSave_decide,
  DashboardEditorSave_isDirty,
  DashboardEditorSave_session,
  DashboardEditorSave_upsert,
  IDashboardEditorSaveDecision,
  IDashboardEditorSession,
} from "../../models/dashboardEditorSave";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { DashboardEditorSheet } from "./DashboardEditorSheet";

const DIAGNOSTICS_DELAY_MS = 300;

export function NavModalDashboardEditor(): JSX.Element {
  const navigation = useNavigation();
  const { state, dispatch } = useAppState();
  const stateRef = useRef(state);
  stateRef.current = state;
  const [opened] = useState(() => LiftographDashboard_document(state.storage));
  const session: IDashboardEditorSession = DashboardEditorSave_session(opened);
  const analysisRef = useRef<LiftographEditorAnalysis | undefined>(undefined);
  if (analysisRef.current == null) {
    analysisRef.current = new LiftographEditorAnalysis(state.storage.settings);
  }
  const analysis = analysisRef.current;
  const liveTextRef = useRef(opened.text);
  const [diagnostics, setDiagnostics] = useState<ILiftographDiagnostic[]>(() =>
    analysis.compileDiagnostics(opened.text)
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const allowCloseRef = useRef(false);

  const onTextChange = (text: string): void => {
    liveTextRef.current = text;
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setDiagnostics(analysis.compileDiagnostics(text)), DIAGNOSTICS_DELAY_MS);
  };
  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const onClose = (): void => {
    allowCloseRef.current = true;
    navigation.goBack();
  };

  const shouldClose = async (): Promise<boolean> => {
    if (DashboardEditorSave_isDirty(session, liveTextRef.current)) {
      if (!(await Dialog_confirm("Discard unsaved changes to this dashboard?"))) {
        return false;
      }
    }
    allowCloseRef.current = true;
    return true;
  };

  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (
        allowCloseRef.current ||
        !DashboardEditorSave_isDirty(DashboardEditorSave_session(opened), liveTextRef.current)
      ) {
        return;
      }
      e.preventDefault();
      Dialog_confirm("Discard unsaved changes to this dashboard?").then((confirmed) => {
        if (confirmed) {
          allowCloseRef.current = true;
          navigation.dispatch(e.data.action);
        }
      });
    });
  }, [navigation, opened]);

  const apply = (decision: IDashboardEditorSaveDecision): void => {
    if (decision.kind === "alert") {
      Dialog_alert(decision.message);
      return;
    }
    if (decision.kind === "write") {
      const updates = [
        lb<IState>()
          .p("storage")
          .p("dashboards")
          .recordModify((dashboards) => DashboardEditorSave_upsert(dashboards, decision.dashboard)),
      ];
      if (decision.currentDashboardId != null) {
        updates.push(lb<IState>().p("storage").p("currentDashboardId").record(decision.currentDashboardId));
      }
      updateState(dispatch, updates, "Save dashboard text");
    }
    onClose();
  };

  const onSave = async (text: string): Promise<void> => {
    liveTextRef.current = text;
    const decision = DashboardEditorSave_decide(stateRef.current.storage, session, text);
    if (decision.kind !== "askSaveAsNew") {
      apply(decision);
    } else if (
      await Dialog_confirm("This dashboard was deleted on another device. Save your text as a new dashboard?")
    ) {
      apply(DashboardEditorSave_confirmAsNew(stateRef.current.storage, text, UidFactory_generateUid(8)));
    }
  };

  return (
    <SheetScreenContainer onClose={onClose} shouldClose={shouldClose} shouldShowClose={true}>
      <TransparentModal onClose={onClose} shouldClose={shouldClose} fitContent={true}>
        <DashboardEditorSheet
          initialText={opened.text}
          title={opened.name}
          analysis={analysis}
          diagnostics={diagnostics}
          onTextChange={onTextChange}
          onCancel={async () => {
            if (await shouldClose()) {
              onClose();
            }
          }}
          onSave={onSave}
        />
      </TransparentModal>
    </SheetScreenContainer>
  );
}
