import { RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import { NavScreenScrollContext } from "../../navigation/NavScreenScrollContext";
import { useGridDragAutoScroll } from "../editProgram/editProgramGrid/gridDragAutoScroll";
import { IDashboardDrop, IDashboardDropCell, IDragPoint } from "../../models/dashboardDrop";
import { IDashboardEditRow } from "../../models/dashboardEdit";
import {
  DashboardDrag_hoverKey,
  DashboardDrag_transition,
  IDashboardDragEffect,
  IDashboardDragEvent,
  IDashboardDragState,
} from "../../models/dashboardDrag";

export interface IDashboardDragOptions {
  text: string;
  rows: IDashboardEditRow[];
  containerRef: RefObject<View | null>;
  onDrop: (slotId: number, drop: IDashboardDrop) => void;
}

export interface IDashboardDrag {
  draggedId?: number;
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  ghostWidth: SharedValue<number>;
  ghostGrab: SharedValue<IDragPoint>;
  hoverKey: SharedValue<string>;
  isHoverRejected: SharedValue<boolean>;
  register: (rowKey: string, cellIndex: number, view: View | null) => void;
  start: (slotId: number, at: IDragPoint) => void;
  move: (translation: IDragPoint, at: IDragPoint) => void;
  end: (commit: boolean) => void;
}

interface IRegisteredCell {
  rowKey: string;
  cellIndex: number;
  view: View;
}

export function useDashboardDrag(options: IDashboardDragOptions): IDashboardDrag {
  const scrollYRef = useContext(NavScreenScrollContext)?.scrollYRef;
  const autoScroll = useGridDragAutoScroll();
  const autoScrollRef = useRef(autoScroll);
  autoScrollRef.current = autoScroll;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [draggedId, setDraggedId] = useState<number | undefined>(undefined);
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostWidth = useSharedValue(0);
  const ghostGrab = useSharedValue<IDragPoint>({ x: 0.5, y: 0.5 });
  const hoverKey = useSharedValue("");
  const isHoverRejected = useSharedValue(false);
  const stateRef = useRef<IDashboardDragState | undefined>(undefined);
  const tokenRef = useRef(0);
  const cellsRef = useRef(new Map<string, IRegisteredCell>());
  const runRef = useRef<(event: IDashboardDragEvent) => void>(() => undefined);

  const register = useCallback((rowKey: string, cellIndex: number, view: View | null) => {
    const key = DashboardDrag_hoverKey(rowKey, cellIndex);
    if (view == null) {
      cellsRef.current.delete(key);
    } else {
      cellsRef.current.set(key, { rowKey, cellIndex, view });
    }
  }, []);

  const measure = useCallback(
    (token: number) => {
      const entries = Array.from(cellsRef.current.values());
      optionsRef.current.containerRef.current?.measureInWindow((ox, oy) => {
        const scrollAtMeasure = scrollYRef?.current ?? 0;
        const cells: IDashboardDropCell[] = [];
        entries.forEach((entry) => {
          entry.view.measureInWindow((x, y, width, height) => {
            cells.push({ rowKey: entry.rowKey, cellIndex: entry.cellIndex, x: x - ox, y: y - oy, width, height });
            if (cells.length === entries.length) {
              runRef.current({
                type: "measured",
                token,
                measure: { origin: { x: ox, y: oy }, cells, scrollAtMeasure },
              });
            }
          });
        });
      });
    },
    [scrollYRef]
  );

  const apply = useCallback(
    (effect: IDashboardDragEffect) => {
      switch (effect.type) {
        case "measure":
          measure(effect.token);
          break;
        case "scrollBegin":
          autoScrollRef.current.begin("y", effect.y, () => runRef.current({ type: "scrolled" }));
          break;
        case "scrollMove":
          autoScrollRef.current.move(effect.dy, effect.y);
          break;
        case "scrollEnd":
          autoScrollRef.current.end();
          break;
        case "showGhost":
          ghostWidth.value = effect.width;
          ghostGrab.value = effect.grab;
          break;
        case "present":
          ghostX.value = effect.point.x;
          ghostY.value = effect.point.y;
          hoverKey.value = effect.hoverKey;
          isHoverRejected.value = effect.isRejected;
          break;
        case "clear":
          hoverKey.value = "";
          isHoverRejected.value = false;
          ghostWidth.value = 0;
          break;
        case "commit":
          optionsRef.current.onDrop(effect.slotId, effect.drop);
          break;
      }
    },
    [measure, ghostX, ghostY, ghostWidth, ghostGrab, hoverKey, isHoverRejected]
  );

  const run = useCallback(
    (event: IDashboardDragEvent) => {
      const context = { rows: optionsRef.current.rows, scrollY: scrollYRef?.current ?? 0 };
      const previous = stateRef.current;
      const result = DashboardDrag_transition(previous, event, context);
      stateRef.current = result.state;
      if (result.state?.slotId !== previous?.slotId) {
        setDraggedId(result.state?.slotId);
      }
      result.effects.forEach(apply);
    },
    [scrollYRef, apply]
  );
  runRef.current = run;

  const start = useCallback(
    (slotId: number, at: IDragPoint) => {
      tokenRef.current += 1;
      run({ type: "start", slotId, at, text: optionsRef.current.text, token: tokenRef.current });
    },
    [run]
  );
  const move = useCallback((translation: IDragPoint, at: IDragPoint) => run({ type: "move", at, translation }), [run]);
  const end = useCallback((commit: boolean) => run({ type: "end", commit }), [run]);

  useEffect(() => {
    run({ type: "textChanged", text: options.text });
  }, [options.text]);

  return useMemo(
    () => ({
      draggedId,
      ghostX,
      ghostY,
      ghostWidth,
      ghostGrab,
      hoverKey,
      isHoverRejected,
      register,
      start,
      move,
      end,
    }),
    [draggedId, ghostX, ghostY, ghostWidth, ghostGrab, hoverKey, isHoverRejected, register, start, move, end]
  );
}
