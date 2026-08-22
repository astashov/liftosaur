import { useCallback, useMemo, useState } from "react";
import { IProgramGrid, IProgramGridSelection, ProgramGrid_select } from "../../../pages/planner/models/programGrid";
import { IGridLaneRef } from "./useGridDrags";

// Three selections, and only ever one of them: an exercise set, a set of day rows, or a week column.
// Each setter clears the other two, because the dock shows one target with one set of verbs — a day
// is a day, not the bag of exercises inside it.
export interface IGridSelectionState {
  selectedIds: string[];
  selectedDayRows: number[];
  selectedWeek?: number;
  selection?: IProgramGridSelection;
  // Which strips the selection covers, as the exercise drag sees them: a placement is one *run* of
  // an exercise across weeks, but what a drag moves is the lane it sits in.
  selectedLanes: IGridLaneRef[];
  // Tapping is a toggle, so multi-select needs no mode to enter or leave.
  onSelect: (placementId: string) => void;
  onSelectDay: (rowIndex: number) => void;
  onSelectWeek: (weekIndex: number) => void;
  onClear: () => void;
}

export function useGridSelectionState(grid: IProgramGrid): IGridSelectionState {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDayRows, setSelectedDayRows] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>(undefined);
  const selection = useMemo(() => ProgramGrid_select(grid, selectedIds), [grid, selectedIds]);
  // Deduplicated: an undulating exercise is several placements in one lane, and dragging it twice
  // would move it out of the day and then look for it there again.
  const selectedLanes = useMemo(() => {
    return (selection?.placements ?? []).reduce<IGridLaneRef[]>((acc, placement) => {
      const seen = acc.some((lane) => lane.row === placement.rowIndex && lane.lane === placement.laneIndex);
      return seen ? acc : [...acc, { row: placement.rowIndex, lane: placement.laneIndex }];
    }, []);
  }, [selection]);

  const onSelect = useCallback((placementId: string) => {
    setSelectedDayRows([]);
    setSelectedWeek(undefined);
    setSelectedIds((current) =>
      current.indexOf(placementId) !== -1 ? current.filter((id) => id !== placementId) : [...current, placementId]
    );
  }, []);

  const onSelectDay = useCallback((rowIndex: number) => {
    setSelectedIds([]);
    setSelectedWeek(undefined);
    setSelectedDayRows((current) =>
      current.indexOf(rowIndex) !== -1 ? current.filter((row) => row !== rowIndex) : [...current, rowIndex]
    );
  }, []);

  const onSelectWeek = useCallback((weekIndex: number) => {
    setSelectedIds([]);
    setSelectedDayRows([]);
    setSelectedWeek((current) => (current === weekIndex ? undefined : weekIndex));
  }, []);

  const onClear = useCallback(() => {
    setSelectedIds([]);
    setSelectedDayRows([]);
    setSelectedWeek(undefined);
  }, []);

  return {
    selectedIds,
    selectedDayRows,
    selectedWeek,
    selection,
    selectedLanes,
    onSelect,
    onSelectDay,
    onSelectWeek,
    onClear,
  };
}
