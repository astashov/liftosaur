import { JSX, useContext, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { IHistoryRecord, ISettings, IStats } from "../../types";
import { DateUtils_formatYYYYMMDD } from "../../utils/date";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../../liftograph/liftographSeriesEval";
import { DashboardView } from "../../components/dashboard/dashboardView";
import { DashboardEditView } from "../../components/dashboard/dashboardEditView";
import { WindowScrollProvider } from "../../components/windowScrollProvider";
import { DashboardWidgetCommit_resolve, IDashboardWidgetModalData } from "../../models/dashboardWidgetCommit";
import { Dialog_alert } from "../../utils/dialog";
import { DashboardEditorBrowserContext } from "./dashboardEditorBrowserContext";

export type IDashboardEditorData =
  | { kind: "loading" }
  | { kind: "ready"; history: IHistoryRecord[]; stats: IStats }
  | { kind: "failed"; message: string };

export interface IDashboardEditorLayoutEditing {
  onChange: (text: string) => void;
  onOpenEditor: (caret: number) => void;
}

function DashboardEditorPreviewReady(props: {
  text: string;
  settings: ISettings;
  history: IHistoryRecord[];
  stats: IStats;
  layoutEditing?: IDashboardEditorLayoutEditing;
}): JSX.Element {
  const { history, stats, settings, layoutEditing } = props;
  const today = DateUtils_formatYYYYMMDD(Date.now());
  const evaluation = useMemo(
    () => LiftographSeriesEval_create({ history, stats, settings, today: Date.now() }),
    [history, stats, settings, today]
  );
  const [widget, setWidget] = useState<IDashboardWidgetModalData | undefined>(undefined);
  const WidgetModal = useContext(DashboardEditorBrowserContext)?.WidgetModal;
  if (layoutEditing != null) {
    return (
      <WindowScrollProvider stickyHeaderHeight={0} footerHeight={0}>
        <DashboardEditView
          text={props.text}
          evaluation={evaluation}
          onChange={layoutEditing.onChange}
          onOpenEditor={layoutEditing.onOpenEditor}
          onOpenWidget={WidgetModal != null ? setWidget : undefined}
        />
        {widget != null && WidgetModal != null ? (
          <WidgetModal
            data={widget}
            settings={settings}
            history={history}
            evaluation={evaluation}
            onClose={() => setWidget(undefined)}
            onDone={(result) => {
              setWidget(undefined);
              const resolved = DashboardWidgetCommit_resolve(props.text, result);
              if (resolved.kind === "alert") {
                Dialog_alert(resolved.message);
              } else if (resolved.kind === "write") {
                layoutEditing.onChange(resolved.text);
              }
            }}
          />
        ) : null}
      </WindowScrollProvider>
    );
  }
  const compiled = LiftographSeriesEval_compile(evaluation, props.text);
  if (compiled.layout.length === 0) {
    return (
      <Text className="py-8 text-center text-text-secondary">This dashboard is empty. Add graphs in the editor.</Text>
    );
  }
  return <DashboardView layout={compiled.layout} text={props.text} evaluation={evaluation} />;
}

export function DashboardEditorPreview(props: {
  text: string;
  settings: ISettings;
  data: IDashboardEditorData;
  layoutEditing?: IDashboardEditorLayoutEditing;
}): JSX.Element {
  const { data } = props;
  return (
    <View testID="dashboard-preview" className="w-full max-w-xl mx-auto">
      {data.kind === "loading" ? (
        <Text className="py-8 text-center text-text-secondary">Loading workouts…</Text>
      ) : data.kind === "failed" ? (
        <Text className="py-8 text-center text-text-error">{data.message}</Text>
      ) : (
        <DashboardEditorPreviewReady
          text={props.text}
          settings={props.settings}
          history={data.history}
          stats={data.stats}
          layoutEditing={props.layoutEditing}
        />
      )}
    </View>
  );
}
