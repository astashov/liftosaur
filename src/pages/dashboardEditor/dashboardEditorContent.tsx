import { JSX, useEffect, useMemo, useState } from "react";
import { IAccount } from "../../models/account";
import { IDashboard, ISettings } from "../../types";
import { IFieldVersion } from "../../models/versionTracker/types";
import { Service } from "../../api/service";
import { Button } from "../../components/button";
import { LinkInlineInput } from "../../components/inlineInput";
import { Tabs2 } from "../../components/tabs2";
import { LiftographCodeEditor } from "../../components/liftographCodeEditor";
import { LiftographEditorAnalysis } from "../../liftograph/liftographEditorAnalysis";
import {
  DashboardDraftSave_edit,
  DashboardDraftSave_failed,
  DashboardDraftSave_init,
  DashboardDraftSave_isDirty,
  DashboardDraftSave_isSaving,
  DashboardDraftSave_start,
  DashboardDraftSave_succeeded,
} from "../../models/dashboardDraftSave";
import { Dialog_alert } from "../../utils/dialog";
import { DashboardEditorPreview, IDashboardEditorData } from "./dashboardEditorPreview";

const PREVIEW_DELAY_MS = 300;

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
  const { draft } = save;
  const [previewText, setPreviewText] = useState(dashboard.text);
  const [data, setData] = useState<IDashboardEditorData>({ kind: "loading" });
  const [tab, setTab] = useState<"editor" | "preview">("editor");
  const [previewAnalysis] = useState(() => new LiftographEditorAnalysis(settings));
  const diagnostics = useMemo(() => previewAnalysis.compileDiagnostics(previewText), [previewAnalysis, previewText]);
  const isDirty = DashboardDraftSave_isDirty(save);
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
    const timer = setTimeout(() => setPreviewText(draft.text), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft.text]);

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
    const { state, request } = DashboardDraftSave_start(save);
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
              value={draft.name}
              onInputString={(name) => setSave((current) => DashboardDraftSave_edit(current, { name }))}
            />
          </h1>
        </div>
        <Button name="dashboard-save" kind="purple" disabled={!isDirty || isSaving} onClick={onSave}>
          {isSaving ? "Saving…" : isDirty ? "Save" : "Saved"}
        </Button>
      </div>
      <div className="mb-4 md:hidden">
        <Tabs2
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
            analysis={analysis}
            diagnostics={diagnostics}
            onChange={(text) => setSave((current) => DashboardDraftSave_edit(current, { text }))}
          />
        </div>
        <div className={`md:w-1/2 min-w-0 ${tab === "preview" ? "" : "hidden md:block"}`}>
          <DashboardEditorPreview text={previewText} settings={settings} data={data} />
        </div>
      </div>
    </div>
  );
}
