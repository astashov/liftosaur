import { JSX, memo, useCallback } from "react";
import { LayoutChangeEvent, Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Text } from "../primitives/text";
import { ActionMenu } from "../actionMenu";
import { IconKebab } from "../icons/iconKebab";
import { DragHandle } from "../dragHandle";
import { DashboardWidget } from "./dashboardView";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { ILiftographWidget } from "../../liftograph/liftographCompile";
import { ILiftographSeriesEval } from "../../liftograph/liftographSeriesEval";
import { ILiftographLayoutSlot } from "../../liftograph/liftographLayout";
import { ILiftographLayoutTarget } from "../../liftograph/liftographLayoutEdit";
import { IDashboardEditAction } from "../../models/dashboardEdit";
import { IDashboardDropEdge, IDragPoint } from "../../models/dashboardDrop";
import { IDashboardDrag } from "./useDashboardDrag";
import { DashboardDrag_hoverKey } from "../../models/dashboardDrag";

const GHOST_MAX_WIDTH = 150;
const GHOST_MAX_HEIGHT = 100;
const GHOST_EMPTY_HEIGHT = 8;

const KIND_LABELS: Record<string, string> = {
  graph: "Graph",
  value: "Value",
  muscles: "Muscles",
  calendar: "Calendar",
  text: "Text",
};

export function DashboardEditTiles_label(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

function useHoverStyle(drag: IDashboardDrag, key: string): ReturnType<typeof useAnimatedStyle> {
  const ok = Tailwind_semantic().border.purple;
  const rejected = Tailwind_semantic().text.error;
  const { hoverKey, isHoverRejected } = drag;
  return useAnimatedStyle(() => ({
    borderColor: hoverKey.value === key ? (isHoverRejected.value ? rejected : ok) : "transparent",
  }));
}

function DashboardEditEdgeLine(props: {
  drag: IDashboardDrag;
  hoverKey: string;
  edge: IDashboardDropEdge;
}): JSX.Element {
  const ok = Tailwind_semantic().border.purple;
  const rejected = Tailwind_semantic().text.error;
  const { hoverKey, isHoverRejected } = props.drag;
  const key = props.hoverKey;
  const style = useAnimatedStyle(() => ({
    opacity: hoverKey.value === key ? 1 : 0,
    backgroundColor: isHoverRejected.value ? rejected : ok,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", top: 0, bottom: 0, width: 4, borderRadius: 2 },
        props.edge === "start" ? { left: -8 } : { right: -8 },
        style,
      ]}
    />
  );
}

function useCellRef(drag: IDashboardDrag, rowKey: string, cellIndex: number): (view: View | null) => void {
  const { register } = drag;
  return useCallback((view: View | null) => register(rowKey, cellIndex, view), [register, rowKey, cellIndex]);
}

export interface IDashboardEditSlotProps {
  slot: ILiftographLayoutSlot;
  widget?: ILiftographWidget;
  rowKey: string;
  cellIndex: number;
  evaluation: ILiftographSeriesEval;
  drag: IDashboardDrag;
  hasWidgetSheet: boolean;
  onAction: (action: IDashboardEditAction) => void;
}

export const DashboardEditSlot = memo(function DashboardEditSlot(props: IDashboardEditSlotProps): JSX.Element {
  const { slot, drag, onAction } = props;
  const hoverStyle = useHoverStyle(drag, DashboardDrag_hoverKey(props.rowKey, props.cellIndex));
  const cellRef = useCellRef(drag, props.rowKey, props.cellIndex);
  const { start, move, end } = drag;
  const onDragStart = useCallback((at: IDragPoint) => start(slot.id, at), [start, slot.id]);
  const isDragged = drag.draggedId === slot.id;
  return (
    <Animated.View
      testID={`dashboard-edit-slot-${slot.id}`}
      className="flex-1 min-w-0 rounded-lg"
      style={[{ borderWidth: 2, opacity: isDragged ? 0.4 : 1 }, hoverStyle]}
    >
      <View ref={cellRef} collapsable={false} style={{ flexGrow: 1 }}>
        <DragHandle onDragStart={onDragStart} onDragMove={move} onDragEnd={end}>
          <View testID={`dashboard-edit-handle-${slot.id}`} pointerEvents="none" className="flex-row min-h-12">
            {props.widget != null ? (
              <DashboardWidget id={`edit-${slot.id}`} widget={props.widget} evaluation={props.evaluation} />
            ) : null}
          </View>
        </DragHandle>
      </View>
      <DashboardEditEdgeLine
        drag={drag}
        hoverKey={DashboardDrag_hoverKey(props.rowKey, props.cellIndex, "start")}
        edge="start"
      />
      <DashboardEditEdgeLine
        drag={drag}
        hoverKey={DashboardDrag_hoverKey(props.rowKey, props.cellIndex, "end")}
        edge="end"
      />
      <View className="absolute top-0 right-0">
        <ActionMenu
          title={DashboardEditTiles_label(slot.kind)}
          actions={[
            {
              label: "Edit",
              testID: "dashboard-edit-menu-edit",
              onPress: () => onAction({ type: "edit", slotId: slot.id }),
            },
            ...(props.hasWidgetSheet && slot.kind !== "text"
              ? [
                  {
                    label: "Edit as text",
                    testID: "dashboard-edit-menu-edit-text",
                    onPress: () => onAction({ type: "editText", slotId: slot.id }),
                  },
                ]
              : []),
            {
              label: "Duplicate",
              testID: "dashboard-edit-menu-duplicate",
              onPress: () => onAction({ type: "duplicate", slotId: slot.id }),
            },
            {
              label: "Delete",
              testID: "dashboard-edit-menu-delete",
              destructive: true,
              onPress: () => onAction({ type: "delete", slotId: slot.id }),
            },
          ]}
          renderTrigger={(open) => (
            <Pressable
              testID={`dashboard-edit-menu-${slot.id}`}
              className="items-center justify-center w-8 h-8 border rounded-full bg-background-default border-border-neutral"
              hitSlop={8}
              onPress={open}
            >
              <IconKebab />
            </Pressable>
          )}
        />
      </View>
    </Animated.View>
  );
});

function kindActions(
  kinds: string[],
  onPick: (kind: string) => void
): { label: string; onPress: () => void; testID: string }[] {
  return kinds.map((kind) => ({
    label: DashboardEditTiles_label(kind),
    testID: `dashboard-edit-kind-${kind}`,
    onPress: () => onPick(kind),
  }));
}

export function DashboardEditEmpty(props: {
  target: ILiftographLayoutTarget;
  kinds: string[];
  rowKey: string;
  cellIndex: number;
  drag: IDashboardDrag;
  height: number;
  onAction: (action: IDashboardEditAction) => void;
}): JSX.Element {
  const hoverStyle = useHoverStyle(props.drag, DashboardDrag_hoverKey(props.rowKey, props.cellIndex));
  const cellRef = useCellRef(props.drag, props.rowKey, props.cellIndex);
  const { target, onAction } = props;
  return (
    <Animated.View
      className="flex-1 min-w-0 rounded-lg"
      style={[{ borderWidth: 2, minHeight: props.height }, hoverStyle]}
    >
      <View ref={cellRef} collapsable={false} style={{ flexGrow: 1 }}>
        <ActionMenu
          title="Add widget"
          actions={kindActions(props.kinds, (kind) => onAction({ type: "insert", target, kind }))}
          renderTrigger={(open) => (
            <Pressable
              testID={`dashboard-edit-empty-${props.rowKey}-${props.cellIndex}`}
              className="items-center justify-center flex-1 border border-dashed rounded-lg border-border-prominent"
              onPress={open}
            >
              <Text className="text-sm text-text-secondary">+ Widget</Text>
            </Pressable>
          )}
        />
      </View>
    </Animated.View>
  );
}

export function DashboardEditPills(props: {
  before: number;
  kinds: string[];
  onAction: (action: IDashboardEditAction) => void;
}): JSX.Element {
  const { before, onAction } = props;
  return (
    <View className="flex-row justify-center gap-2 py-2">
      <ActionMenu
        title="Add widget"
        actions={kindActions(props.kinds, (kind) =>
          onAction({ type: "insert", target: { kind: "newRow", before, isRow: false }, kind })
        )}
        renderTrigger={(open) => (
          <Pressable
            testID={`dashboard-edit-add-widget-${before}`}
            className="px-3 py-1 border rounded-full border-border-prominent"
            onPress={open}
          >
            <Text className="text-xs font-semibold text-text-purple">+ Widget</Text>
          </Pressable>
        )}
      />
      <Pressable
        testID={`dashboard-edit-add-row-${before}`}
        className="px-3 py-1 border rounded-full border-border-prominent"
        onPress={() => onAction({ type: "addRow", before, count: 2 })}
      >
        <Text className="text-xs font-semibold text-text-purple">+ Row</Text>
      </Pressable>
    </View>
  );
}

export function DashboardEditDropLine(props: { drag: IDashboardDrag; rowKey: string; offset: number }): JSX.Element {
  const { hoverKey } = props.drag;
  const key = DashboardDrag_hoverKey(props.rowKey);
  const color = Tailwind_semantic().border.purple;
  const style = useAnimatedStyle(() => ({ opacity: hoverKey.value === key ? 1 : 0 }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          top: props.offset,
          height: 3,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function DashboardEditGhost(props: {
  drag: IDashboardDrag;
  widget?: ILiftographWidget;
  evaluation: ILiftographSeriesEval;
}): JSX.Element {
  const { ghostX, ghostY, ghostWidth, ghostGrab } = props.drag;
  const contentHeight = useSharedValue(0);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      contentHeight.value = e.nativeEvent.layout.height;
    },
    [contentHeight]
  );
  const style = useAnimatedStyle(() => {
    const width = ghostWidth.value;
    const height = contentHeight.value;
    const isReady = width > 0 && height > GHOST_EMPTY_HEIGHT;
    const scale = isReady ? Math.min(1, GHOST_MAX_WIDTH / width, GHOST_MAX_HEIGHT / height) : 1;
    const grab = ghostGrab.value;
    return {
      width,
      opacity: isReady ? 1 : 0,
      transform: [
        { translateX: ghostX.value - width / 2 - scale * (grab.x * width - width / 2) },
        { translateY: ghostY.value - height / 2 - scale * (grab.y * height - height / 2) },
        { scale },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      onLayout={onLayout}
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          borderRadius: 8,
          backgroundColor: Tailwind_semantic().background.default,
          borderWidth: 2,
          borderColor: Tailwind_semantic().border.purple,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 12,
        },
        style,
      ]}
    >
      {props.widget != null ? (
        <View className="flex-row">
          <DashboardWidget id="edit-ghost" widget={props.widget} evaluation={props.evaluation} />
        </View>
      ) : null}
    </Animated.View>
  );
}
