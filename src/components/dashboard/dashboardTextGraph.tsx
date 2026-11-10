import { JSX, memo, useMemo } from "react";
import { View } from "react-native";
import { IHistoryRecord } from "../../types";
import { ILiftographSeriesEval } from "../../liftograph/liftographSeriesEval";
import { LiftographGraphs_widget } from "../../liftograph/liftographGraphs";
import { DashboardGraph } from "./dashboardGraph";
import { DashboardNotice } from "./dashboardNotice";

export interface IDashboardTextGraphProps {
  id: string;
  text: string;
  evaluation: ILiftographSeriesEval;
  isInteractive?: boolean;
  onInteract?: () => void;
  onOpenRecord?: (record: IHistoryRecord) => void;
}

export const DashboardTextGraph = memo(function DashboardTextGraph(props: IDashboardTextGraphProps): JSX.Element {
  const { text, evaluation } = props;
  const widget = useMemo(() => LiftographGraphs_widget(evaluation, text), [evaluation, text]);
  if (widget == null) {
    return <DashboardNotice message="This graph can't be shown" isError />;
  }
  return (
    <View className="flex-row">
      <DashboardGraph
        id={props.id}
        widget={widget}
        evaluation={evaluation}
        isInteractive={props.isInteractive}
        onInteract={props.onInteract}
        onOpenRecord={props.onOpenRecord}
      />
    </View>
  );
});
