import { JSX, useMemo, useState } from "react";
import { View } from "react-native";
import { Markdown } from "../markdown";
import { ActiveGraphContext, IActiveGraphContext } from "../activeGraphContext";
import { IHistoryRecord } from "../../types";
import { ILiftographCompiled, ILiftographWidget } from "../../liftograph/liftographCompile";
import { ILiftographSeriesEval } from "../../liftograph/liftographSeriesEval";
import { LiftographDashboard_isHeading, LiftographDashboard_widgetKey } from "../../liftograph/liftographDashboard";
import { DashboardGraph } from "./dashboardGraph";
import { DashboardValue } from "./dashboardValue";
import { DashboardNotice } from "./dashboardNotice";

interface IDashboardWidgetProps {
  id: string;
  widget: ILiftographWidget;
  evaluation: ILiftographSeriesEval;
  onOpenRecord?: (record: IHistoryRecord) => void;
}

function DashboardWidget(props: IDashboardWidgetProps): JSX.Element | null {
  const { widget, evaluation } = props;
  if (widget.kind === "graph") {
    return <DashboardGraph id={props.id} widget={widget} evaluation={evaluation} onOpenRecord={props.onOpenRecord} />;
  } else if (widget.kind === "value") {
    return <DashboardValue widget={widget} evaluation={evaluation} />;
  } else if (widget.kind === "text") {
    return (
      <View className={`flex-1 ${LiftographDashboard_isHeading(widget.markdown) ? "mt-2" : "py-1"}`}>
        {widget.caption != null ? <Markdown value={widget.caption} className="mb-1" isHtmlDisabled /> : null}
        <Markdown value={widget.markdown} isHtmlDisabled />
      </View>
    );
  } else if (widget.kind === "error") {
    return <DashboardNotice caption={widget.caption} message={widget.message} isError />;
  } else if (widget.kind === "unsupported") {
    return <DashboardNotice caption={widget.caption} message={widget.message} isError />;
  }
  return <DashboardNotice caption={widget.caption} message={`The ${widget.kind} widget is coming soon.`} />;
}

export function DashboardView(props: {
  layout: ILiftographCompiled["layout"];
  text: string;
  evaluation: ILiftographSeriesEval;
  onOpenRecord?: (record: IHistoryRecord) => void;
}): JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeGraphValue = useMemo<IActiveGraphContext>(() => ({ activeId, setActive: setActiveId }), [activeId]);
  return (
    <ActiveGraphContext.Provider value={activeGraphValue}>
      {props.layout.map((row, rowIndex) => (
        <View key={rowIndex} className="mb-2">
          {row.caption != null ? <Markdown value={row.caption} className="mb-1" isHtmlDisabled /> : null}
          <View className="flex-row gap-2">
            {row.items.map((widget, itemIndex) => {
              const key = LiftographDashboard_widgetKey(
                rowIndex,
                itemIndex,
                props.text.slice(widget.span.from, widget.span.to)
              );
              return (
                <DashboardWidget
                  key={key}
                  id={key}
                  widget={widget}
                  evaluation={props.evaluation}
                  onOpenRecord={props.onOpenRecord}
                />
              );
            })}
          </View>
        </View>
      ))}
    </ActiveGraphContext.Provider>
  );
}
