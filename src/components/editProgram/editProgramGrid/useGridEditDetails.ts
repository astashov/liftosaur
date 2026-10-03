import { useCallback } from "react";
import { IProgramGrid } from "../../../pages/planner/models/programGrid";
import { IPlannerDayDetails, IPlannerWeekDetails } from "../../../pages/planner/models/plannerStructure";
import { IGridHost } from "./gridHost";

export interface IGridEditDetails {
  onEditWeek: (weekIndex: number) => void;
  onEditDay: (rowIndex: number) => void;
}

// Editing a name and a description is the one grid command that is both halves of the split: it
// opens a modal like the host's navigation and it edits like useGridActions'. So it lives here
// instead, and hands the answer to the edit — which stays behind the same transform as every
// other one.
export function useGridEditDetails(args: {
  grid: IProgramGrid;
  openEditDetails: IGridHost["openEditDetails"];
  onSetWeekDetails: (weekIndex: number, details: IPlannerWeekDetails) => void;
  onSetDayDetails: (rowIndex: number, details: IPlannerDayDetails) => void;
}): IGridEditDetails {
  const { grid, openEditDetails, onSetWeekDetails, onSetDayDetails } = args;

  const onEditWeek = useCallback(
    (weekIndex: number) => {
      const column = grid.columns[weekIndex];
      if (column == null) {
        return;
      }
      openEditDetails(
        {
          title: "Edit week",
          namePlaceholder: column.name,
          descriptionPlaceholder: "Week description in Markdown...",
          dataCyPrefix: "edit-week",
          name: column.name,
          description: column.description,
        },
        (details) => {
          if (details != null) {
            onSetWeekDetails(weekIndex, details);
          }
        }
      );
    },
    [grid, openEditDetails, onSetWeekDetails]
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
      openEditDetails(
        {
          title: "Edit day",
          namePlaceholder: name,
          descriptionPlaceholder: "Day description in Markdown...",
          dataCyPrefix: "edit-day",
          name,
          description,
        },
        (details) => {
          if (details == null) {
            return;
          }
          onSetDayDetails(rowIndex, {
            name: details.name !== name ? details.name : undefined,
            description: details.description !== description ? (details.description ?? "") : undefined,
          });
        }
      );
    },
    [grid, openEditDetails, onSetDayDetails]
  );

  return { onEditWeek, onEditDay };
}
