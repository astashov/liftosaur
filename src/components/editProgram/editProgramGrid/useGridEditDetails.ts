import { useCallback, useRef } from "react";
import { useModal } from "../../../navigation/ModalStateContext";
import { IProgramGrid } from "../../../pages/planner/models/programGrid";
import { IPlannerDayDetails, IPlannerWeekDetails } from "../../../pages/planner/models/plannerStructure";

interface IPendingEdit {
  kind: "week" | "day";
  index: number;
  name: string;
  description?: string;
}

export interface IGridEditDetails {
  onEditWeek: (weekIndex: number) => void;
  onEditDay: (rowIndex: number) => void;
}

// Editing a name and a description is the one grid command that is both halves of the split: it
// opens a modal like useGridNavigation's commands and it edits like useGridActions'. So it lives
// here instead, and hands the answer to the edit — which stays behind the same transform as every
// other one.
export function useGridEditDetails(args: {
  grid: IProgramGrid;
  onSetWeekDetails: (weekIndex: number, details: IPlannerWeekDetails) => void;
  onSetDayDetails: (rowIndex: number, details: IPlannerDayDetails) => void;
}): IGridEditDetails {
  const { grid, onSetWeekDetails, onSetDayDetails } = args;
  // useModal registers one result callback and the modal answers with a name and a description
  // only, so this is what says what they belong to — and what they were before, which is how a day
  // tells the field it edited from the one it merely looked at.
  const pendingRef = useRef<IPendingEdit | undefined>(undefined);

  const openEditDetails = useModal("editDetailsModal", (details) => {
    const pending = pendingRef.current;
    pendingRef.current = undefined;
    if (details == null || pending == null) {
      return;
    }
    if (pending.kind === "week") {
      onSetWeekDetails(pending.index, details);
    } else {
      // A day row is written out by every week, and they may not agree — so only the field the user
      // changed travels to all of them.
      onSetDayDetails(pending.index, {
        name: details.name !== pending.name ? details.name : undefined,
        description: details.description !== pending.description ? (details.description ?? "") : undefined,
      });
    }
  });

  const onEditWeek = useCallback(
    (weekIndex: number) => {
      const column = grid.columns[weekIndex];
      if (column == null) {
        return;
      }
      pendingRef.current = { kind: "week", index: weekIndex, name: column.name, description: column.description };
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

  const onEditDay = useCallback(
    (rowIndex: number) => {
      const row = grid.rows[rowIndex];
      if (row == null) {
        return;
      }
      // What the grid shows for the row: the first week that has this day. Weeks that name or
      // describe it differently keep what they say unless the user edits that field.
      const name = row.namePerWeek.find((n) => n != null) ?? `Day ${rowIndex + 1}`;
      const description = row.descriptionPerWeek.find((d) => d != null);
      pendingRef.current = { kind: "day", index: rowIndex, name, description };
      openEditDetails({
        title: "Edit day",
        nameLabel: "Name",
        namePlaceholder: name,
        descriptionPlaceholder: "Day description in Markdown...",
        submitLabel: "Save",
        dataCyPrefix: "edit-day",
        name,
        description,
      });
    },
    [grid, openEditDetails]
  );

  return { onEditWeek, onEditDay };
}
