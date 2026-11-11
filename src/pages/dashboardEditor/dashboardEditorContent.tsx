import { JSX, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { IconUndo } from "../../components/icons/iconUndo";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { IAccount } from "../../models/account";
import { IDashboard, ISettings } from "../../types";
import { IFieldVersion } from "../../models/versionTracker/types";
import { Service } from "../../api/service";
import { Button } from "../../components/button";
import { LinkInlineInput } from "../../components/inlineInput";
import { Tabs2 } from "../../components/tabs2";
import { ILiftographCodeEditorReveal, LiftographCodeEditor } from "../../components/liftographCodeEditor";
import { useDashboardDraft } from "../../components/dashboard/useDashboardDraft";
import { useUndoRedo } from "../builder/utils/undoredo";
import { LiftographEditorAnalysis } from "../../liftograph/liftographEditorAnalysis";
import {
  DashboardDraftSave_failed,
  DashboardDraftSave_init,
  DashboardDraftSave_isDirty,
  DashboardDraftSave_isSaving,
  DashboardDraftSave_rename,
  DashboardDraftSave_start,
  DashboardDraftSave_succeeded,
} from "../../models/dashboardDraftSave";
import { Dialog_alert } from "../../utils/dialog";
import { DashboardEditorPreview, IDashboardEditorData } from "./dashboardEditorPreview";

const PREVIEW_DELAY_MS = 300;

function undoColor(isEnabled: boolean): string {
  return isEnabled ? Tailwind_semantic().icon.neutral : Tailwind_semantic().icon.light;
}

export interface IDashboardEditorPageData {
  isMobile: boolean;
  account: IAccount;
  dashboard: IDashboard;
  settings: ISettings;
  base?: IFieldVersion;
}

export interface IDashboardEditorContentProps extends IDashboardEditorPageData {
  client: Window["fetch"];
  deviceId: string;
}

export function DashboardEditorContent(props: IDashboardEditorContentProps): JSX.Element {
  const { dashboard, settings } = props;
  const service = useMemo(() => new Service(props.client), [props.client]);
  const [analysis] = useState(() => new LiftographEditorAnalysis(settings));
  const [save, setSave] = useState(() =>
    DashboardDraftSave_init({ name: dashboard.name, text: dashboard.text }, props.base)
  );
  const textDraft = useDashboardDraft(dashboard.text);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const [reveal, setReveal] = useState<ILiftographCodeEditorReveal | undefined>(undefined);
  useUndoRedo(textDraft.state, textDraft.dispatch);
  const [previewText, setPreviewText] = useState(dashboard.text);
  const [data, setData] = useState<IDashboardEditorData>({ kind: "loading" });
  const [tab, setTab] = useState<"editor" | "preview">("editor");
  const [previewAnalysis] = useState(() => new LiftographEditorAnalysis(settings));
  const diagnostics = useMemo(() => previewAnalysis.compileDiagnostics(previewText), [previewAnalysis, previewText]);
  const isDirty = DashboardDraftSave_isDirty(save, textDraft.text);
  const isSaving = DashboardDraftSave_isSaving(save);

  useEffect(() => {
    Promise.all([service.getFullHistory(), service.getStats()])
      .then(([history, stats]) => {
        analysis.setHistory(history);
        setData({ kind: "ready", history, stats });
      })
      .catch(() => setData({ kind: "failed", message: "Couldn't load your workouts. Reload the page to try again." }));
  }, [service]);

  useEffect(() => {
    const timer = setTimeout(() => setPreviewText(textDraft.text), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [textDraft.text]);

  const onOpenEditor = (caret: number): void => {
    setReveal((current) => ({ at: caret, key: (current?.key ?? 0) + 1 }));
    setTab("editor");
  };

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const onSave = async (): Promise<void> => {
    const { state, request } = DashboardDraftSave_start(save, textDraft.text);
    if (request == null) {
      return;
    }
    setSave(state);
    const result = await service.postUpdateDashboard(dashboard.id, request.snapshot, request.base, props.deviceId);
    if (result.success) {
      setSave((current) => DashboardDraftSave_succeeded(current, result.data.base));
    } else {
      setSave(DashboardDraftSave_failed);
      Dialog_alert(result.error);
    }
  };

  return (
    <div className="px-4" data-testid="dashboard-editor-page">
      <div className="flex items-center gap-4 pb-4">
        <div className="flex-1 min-w-0">
          <a href="/user/dashboards" className="text-xs underline text-text-link">
            All dashboards
          </a>
          <h1 className="text-2xl font-bold md:text-3xl">
            <LinkInlineInput
              value={save.name}
              onInputString={(name) => setSave((current) => DashboardDraftSave_rename(current, name))}
            />
          </h1>
        </div>
        <Pressable
          testID="dashboard-undo"
          data-testid="dashboard-undo"
          accessibilityLabel="Undo"
          className="p-2"
          disabled={!textDraft.canUndo}
          onPress={textDraft.undo}
        >
          <IconUndo width={22} height={22} color={undoColor(textDraft.canUndo)} />
        </Pressable>
        <Pressable
          testID="dashboard-redo"
          data-testid="dashboard-redo"
          accessibilityLabel="Redo"
          className="p-2"
          disabled={!textDraft.canRedo}
          onPress={textDraft.redo}
        >
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <IconUndo width={22} height={22} color={undoColor(textDraft.canRedo)} />
          </View>
        </Pressable>
        <Button name="dashboard-save" kind="purple" disabled={!isDirty || isSaving} onClick={onSave}>
          {isSaving ? "Saving…" : isDirty ? "Save" : "Saved"}
        </Button>
      </div>
      <div className="mb-4 md:hidden">
        <Tabs2
          key={tab}
          defaultIndex={tab === "editor" ? 0 : 1}
          tabs={[
            ["Editor", null],
            ["Preview", null],
          ]}
          onChange={(index) => setTab(index === 0 ? "editor" : "preview")}
        />
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <div className={`md:w-1/2 min-w-0 ${tab === "editor" ? "" : "hidden md:block"}`}>
          <LiftographCodeEditor
            isFullHeight
            initialText={dashboard.text}
            value={textDraft.text}
            reveal={reveal}
            analysis={analysis}
            diagnostics={diagnostics}
            onChange={textDraft.setText}
          />
        </div>
        <div className={`md:w-1/2 min-w-0 ${tab === "preview" ? "" : "hidden md:block"}`}>
          <div className="flex justify-end pb-2">
            <Button
              name="dashboard-edit-layout"
              kind={isLayoutEditing ? "purple" : "lightgrayv3"}
              buttonSize="sm"
              onClick={() => setIsLayoutEditing(!isLayoutEditing)}
            >
              {isLayoutEditing ? "Done editing layout" : "Edit layout"}
            </Button>
          </div>
          <DashboardEditorPreview
            text={isLayoutEditing ? textDraft.text : previewText}
            settings={settings}
            data={data}
            layoutEditing={isLayoutEditing ? { onChange: textDraft.setText, onOpenEditor } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
