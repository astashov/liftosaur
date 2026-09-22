import { createContext, RefObject, useContext, useEffect, useRef } from "react";
import { Platform, ScrollView, View } from "react-native";
import { NavScreenScrollContext } from "../navigation/NavScreenScrollContext";
import { WorkoutCenterScroll_targetY } from "../utils/workoutCenterScroll";

export const WorkoutExpandedRowsContext = createContext<Map<number, View> | undefined>(undefined);

export function useExpandedRowRegistration(entryIndex: number, isExpanded: boolean): RefObject<View | null> {
  const rowRef = useRef<View>(null);
  const rows = useContext(WorkoutExpandedRowsContext);
  useEffect(() => {
    const node = rowRef.current;
    if (!isExpanded || rows == null || node == null) {
      return undefined;
    }
    rows.set(entryIndex, node);
    return () => {
      if (rows.get(entryIndex) === node) {
        rows.delete(entryIndex);
      }
    };
  }, [isExpanded, rows, entryIndex]);
  return rowRef;
}

interface IWorkoutCenterExpandedRowProps {
  pageChangeToggle: boolean;
  entryIndex: number;
  entryId: string | undefined;
}

export function WorkoutCenterExpandedRow(props: IWorkoutCenterExpandedRowProps): null {
  const scrollCtx = useContext(NavScreenScrollContext);
  const rows = useContext(WorkoutExpandedRowsContext);
  const entryIndexRef = useRef(props.entryIndex);
  entryIndexRef.current = props.entryIndex;
  const previousEntryIdRef = useRef(props.entryId);

  useEffect(() => {
    const isPageChange = previousEntryIdRef.current !== props.entryId;
    if (!isPageChange || Platform.OS === "web" || scrollCtx == null || rows == null) {
      return undefined;
    }
    const centerOnceLaidOut = (): void => {
      const row = rows.get(entryIndexRef.current);
      const viewport = scrollCtx.viewportRef.current;
      const scrollNode = scrollCtx.scrollRef.current as ScrollView | null;
      if (row == null || viewport == null || scrollNode == null) {
        return;
      }
      viewport.measureInWindow((_vx, viewportTop, _vw, viewportHeight) => {
        row.measureInWindow((_rx, rowTop, _rw, rowHeight) => {
          const scrollY = scrollCtx.scrollYRef.current;
          const y = WorkoutCenterScroll_targetY({
            scrollY,
            rowTop,
            rowHeight,
            viewportTop,
            viewportHeight,
            stickyHeaderHeight: scrollCtx.stickyHeaderHeight,
            footerHeight: scrollCtx.footerHeight,
            contentHeight: scrollCtx.contentSizeRef.current.height,
          });
          if (Math.abs(y - scrollY) >= 1) {
            scrollNode.scrollTo({ y, animated: true });
          }
        });
      });
    };
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(centerOnceLaidOut);
    });
    return () => cancelAnimationFrame(frame);
  }, [props.pageChangeToggle]);
  useEffect(() => {
    previousEntryIdRef.current = props.entryId;
  }, [props.entryId]);

  return null;
}
