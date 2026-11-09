import { JSX, useCallback, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/text";
import { Markdown } from "../markdown";
import { LiftographDocument_parse } from "../../liftograph/liftographDocument";
import { LiftographLayout_build, LiftographLayout_slot } from "../../liftograph/liftographLayout";
import { ILiftographSeriesEval, LiftographSeriesEval_compile } from "../../liftograph/liftographSeriesEval";
import {
  DashboardEdit_apply,
  DashboardEdit_kindsFor,
  DashboardEdit_reservations,
  DashboardEdit_rows,
  DashboardEdit_widgets,
  IDashboardEditAction,
  IDashboardEditRow,
} from "../../models/dashboardEdit";
import type { IDashboardWidgetModalData } from "../../models/dashboardWidgetCommit";
import { DashboardDrop_endKey, IDashboardDrop } from "../../models/dashboardDrop";
import { Dialog_alert } from "../../utils/dialog";
import { useRem } from "../../utils/useRem";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { useDashboardDrag } from "./useDashboardDrag";
import {
  DashboardEditDropLine,
  DashboardEditEmpty,
  DashboardEditGhost,
  DashboardEditPills,
  DashboardEditSlot,
} from "./dashboardEditTiles";

export interface IDashboardEditViewProps {
  text: string;
  evaluation: ILiftographSeriesEval;
  onChange: (text: string) => void;
  onOpenEditor: (caret: number) => void;
  onOpenWidget?: (data: IDashboardWidgetModalData) => void;
}

function nextBefore(row: IDashboardEditRow): number {
  return row.row != null ? row.row.index + 1 : row.before;
}

function DashboardEditRowHeader(props: {
  row: IDashboardEditRow;
  height: number;
  onAction: (action: IDashboardEditAction) => void;
}): JSX.Element {
  const { row, onAction } = props;
  return (
    <View className="flex-row items-center gap-2" style={{ height: props.height }}>
      <Text className="text-xs font-semibold tracking-wider text-text-secondary">ROW</Text>
      <View className="flex-row overflow-hidden border rounded-lg border-border-neutral">
        {row.counts.map((option, index) => {
          const isSelected = option.count === row.count;
          return (
            <Pressable
              key={option.count}
              testID={`dashboard-edit-count-${row.key}-${option.count}`}
              disabled={!option.isAllowed}
              hitSlop={{ top: 6, bottom: 6 }}
              className="items-center justify-center w-10 h-8"
              style={{
                borderLeftWidth: index > 0 ? 1 : 0,
                borderColor: Tailwind_semantic().border.neutral,
                backgroundColor: isSelected
                  ? Tailwind_semantic().background.cardpurpleselected
                  : option.isAllowed
                    ? "transparent"
                    : Tailwind_semantic().background.subtle,
              }}
              onPress={() => onAction({ type: "setCount", rowKey: row.key, count: option.count })}
            >
              <Text
                className={`text-sm ${isSelected ? "font-semibold text-text-purple" : option.isAllowed ? "text-text-primary" : "text-text-disabled"}`}
                style={option.isAllowed ? undefined : { opacity: 0.4 }}
              >
                {option.count}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-1" />
      {row.row == null ? (
        <Pressable
          testID={`dashboard-edit-cancel-${row.key}`}
          className="px-2"
          onPress={() => onAction({ type: "cancelRow", before: row.before })}
        >
          <Text className="text-xs text-text-link">Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function DashboardEditView(props: IDashboardEditViewProps): JSX.Element {
  const { text, evaluation } = props;
  const rem = useRem();
  const tileHeight = 4 * rem;
  const rowHeaderHeight = 2.75 * rem;
  const layout = useMemo(() => LiftographLayout_build(LiftographDocument_parse(text)), [text]);
  const compiledLayout = useMemo(() => LiftographSeriesEval_compile(evaluation, text).layout, [evaluation, text]);
  const widgets = useMemo(() => DashboardEdit_widgets(compiledLayout), [compiledLayout]);
  const [reservations, setReservations] = useState(() => DashboardEdit_reservations(text));
  const rows = useMemo(() => DashboardEdit_rows(layout, reservations), [layout, reservations]);
  const containerRef = useRef<View>(null);

  const stateRef = useRef({ layout, reservations, props });
  stateRef.current = { layout, reservations, props };
  const run = useCallback((action: IDashboardEditAction) => {
    const current = stateRef.current;
    const onOpenWidget = current.props.onOpenWidget;
    const result = DashboardEdit_apply(current.layout, current.reservations, action, {
      hasWidgetSheet: onOpenWidget != null,
    });
    setReservations(result.reservations);
    if (result.text !== current.layout.text) {
      current.props.onChange(result.text);
    }
    if (result.effect?.type === "openEditor") {
      current.props.onOpenEditor(result.effect.caret);
    } else if (result.effect?.type === "openWidget") {
      onOpenWidget?.({ anchor: result.effect.anchor, snippet: result.effect.snippet, mode: result.effect.mode });
    } else if (result.effect?.type === "alert") {
      Dialog_alert(result.effect.message);
    }
  }, []);
  const onDrop = useCallback((slotId: number, drop: IDashboardDrop) => run({ type: "drop", slotId, drop }), [run]);
  const drag = useDashboardDrag({ text, rows, containerRef, onDrop });
  const draggedSlot = drag.draggedId != null ? LiftographLayout_slot(layout, drag.draggedId) : undefined;

  return (
    <View ref={containerRef} testID="dashboard-edit-view" style={{ position: "relative" }}>
      {rows.length === 0 ? (
        <DashboardEditPills
          before={0}
          kinds={DashboardEdit_kindsFor(rows, { kind: "newRow", before: 0, isRow: false })}
          onAction={run}
        />
      ) : null}
      {rows.map((row) => (
        <View key={row.key} style={{ position: "relative" }}>
          {row.row != null && compiledLayout[row.row.index]?.caption != null ? (
            <Markdown value={compiledLayout[row.row.index]?.caption ?? ""} className="mb-1" isHtmlDisabled />
          ) : null}
          <DashboardEditDropLine drag={drag} rowKey={row.key} offset={rowHeaderHeight / 2} />
          <DashboardEditRowHeader row={row} height={rowHeaderHeight} onAction={run} />
          <View className="flex-row gap-2">
            {row.cells.map((cell, cellIndex) =>
              cell.type === "slot" ? (
                <DashboardEditSlot
                  key={cell.slot.id}
                  slot={cell.slot}
                  widget={widgets.get(cell.slot.itemFrom)}
                  rowKey={row.key}
                  cellIndex={cellIndex}
                  evaluation={evaluation}
                  drag={drag}
                  hasWidgetSheet={props.onOpenWidget != null}
                  onAction={run}
                />
              ) : (
                <DashboardEditEmpty
                  key={`empty-${cellIndex}`}
                  target={cell.target}
                  kinds={cell.kinds}
                  rowKey={row.key}
                  cellIndex={cellIndex}
                  drag={drag}
                  height={2 * tileHeight}
                  onAction={run}
                />
              )
            )}
          </View>
          <DashboardEditPills
            before={nextBefore(row)}
            kinds={DashboardEdit_kindsFor(rows, { kind: "newRow", before: nextBefore(row), isRow: false })}
            onAction={run}
          />
        </View>
      ))}
      <View style={{ position: "relative", height: rowHeaderHeight }}>
        <DashboardEditDropLine drag={drag} rowKey={DashboardDrop_endKey} offset={0} />
      </View>
      <DashboardEditGhost
        drag={drag}
        widget={draggedSlot != null ? widgets.get(draggedSlot.itemFrom) : undefined}
        evaluation={evaluation}
      />
    </View>
  );
}
