import { useCallback, useMemo, useState } from "react";
import { IProgramGrid, IProgramGridSelection, ProgramGrid_select } from "../../../pages/planner/models/programGrid";

// Three selections, and only ever one of them: an exercise set, a day row, or a week column. Each
// setter clears the other two, because the dock shows one target with one set of verbs — a day is a
// day, not the bag of exercises inside it.
export interface IGridSelectionState {
  selectedIds: string[];
  selectedDayRow?: number;
  selectedWeek?: number;
  selection?: IProgramGridSelection;
  // Tapping is a toggle, so multi-select needs no mode to enter or leave.
  onSelect: (placementId: string) => void;
  onSelectDay: (rowIndex: number) => void;
  onSelectWeek: (weekIndex: number) => void;
  onClear: () => void;
}

export function useGridSelectionState(grid: IProgramGrid): IGridSelectionState {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDayRow, setSelectedDayRow] = useState<number | undefined>(undefined);
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>(undefined);
  const selection = useMemo(() => ProgramGrid_select(grid, selectedIds), [grid, selectedIds]);

  const onSelect = useCallback((placementId: string) => {
    setSelectedDayRow(undefined);
    setSelectedWeek(undefined);
    setSelectedIds((current) =>
      current.indexOf(placementId) !== -1 ? current.filter((id) => id !== placementId) : [...current, placementId]
    );
  }, []);

  const onSelectDay = useCallback((rowIndex: number) => {
    setSelectedIds([]);
    setSelectedWeek(undefined);
    setSelectedDayRow((current) => (current === rowIndex ? undefined : rowIndex));
  }, []);

  const onSelectWeek = useCallback((weekIndex: number) => {
    setSelectedIds([]);
    setSelectedDayRow(undefined);
    setSelectedWeek((current) => (current === weekIndex ? undefined : weekIndex));
  }, []);

  const onClear = useCallback(() => {
    setSelectedIds([]);
    setSelectedDayRow(undefined);
    setSelectedWeek(undefined);
  }, []);

  return { selectedIds, selectedDayRow, selectedWeek, selection, onSelect, onSelectDay, onSelectWeek, onClear };
}
