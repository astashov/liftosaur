import { JSX, useMemo } from "react";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { IHistoryRecord, ISettings, IStats } from "../../types";
import { DateUtils_formatYYYYMMDD } from "../../utils/date";
import { LiftographSeriesEval_compile, LiftographSeriesEval_create } from "../../liftograph/liftographSeriesEval";
import { DashboardView } from "../../components/dashboard/dashboardView";
import { DashboardEditView } from "../../components/dashboard/dashboardEditView";
import { WindowScrollProvider } from "../../components/windowScrollProvider";

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
  const { history, stats, settings } = props;
  const today = DateUtils_formatYYYYMMDD(Date.now());
  const evaluation = useMemo(
    () => LiftographSeriesEval_create({ history, stats, settings, today: Date.now() }),
    [history, stats, settings, today]
  );
  if (props.layoutEditing != null) {
    return (
      <WindowScrollProvider stickyHeaderHeight={0} footerHeight={0}>
        <DashboardEditView
          text={props.text}
          evaluation={evaluation}
          onChange={props.layoutEditing.onChange}
          onOpenEditor={props.layoutEditing.onOpenEditor}
        />
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
