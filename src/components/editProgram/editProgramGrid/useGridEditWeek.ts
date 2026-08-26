import { useCallback, useRef } from "react";
import { useModal } from "../../../navigation/ModalStateContext";
import { IProgramGrid } from "../../../pages/planner/models/programGrid";
import { IPlannerWeekDetails } from "../../../pages/planner/models/plannerStructure";

// Editing a week's name and description is the one grid command that is both halves of the split:
// it opens a modal like useGridNavigation's commands and it edits like useGridActions'. So it lives
// here instead, and hands the answer to the edit — which stays behind the same transform as every
// other one.
export function useGridEditWeek(args: {
  grid: IProgramGrid;
  onSetDetails: (weekIndex: number, details: IPlannerWeekDetails) => void;
}): (weekIndex: number) => void {
  const { grid, onSetDetails } = args;
  // useModal registers one result callback and the modal answers with the details only, so this is
  // what says which week the answer is for.
  const pendingRef = useRef<number | undefined>(undefined);

  const openEditDetails = useModal("editDetailsModal", (details) => {
    const weekIndex = pendingRef.current;
    pendingRef.current = undefined;
    if (details != null && weekIndex != null) {
      onSetDetails(weekIndex, details);
    }
  });

  return useCallback(
    (weekIndex: number) => {
      const column = grid.columns[weekIndex];
      if (column == null) {
        return;
      }
      pendingRef.current = weekIndex;
      openEditDetails({
        title: "Edit week",
        nameLabel: "Name",
        namePlaceholder: column.name,
        descriptionPlaceholder: "Week description in Markdown...",
        submitLabel: "Save",
        dataCyPrefix: "edit-week",
        name: column.name,
        description: column.description,
      });
    },
    [grid, openEditDetails]
  );
}
