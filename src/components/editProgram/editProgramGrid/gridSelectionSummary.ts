import { StringUtils_pluralize } from "../../../utils/string";
import { ProgramGrid_orderSuffix } from "../../../pages/planner/models/programGrid";
import type { IGridSelectionPayload } from "./gridSelectionContext";

export interface IGridSelectionAction {
  label: string;
  isDestructive?: boolean;
  onPress: () => void;
}

export interface IGridSelectionSummary {
  label: string;
  detailsKey?: string;
  badges: string[];
  description?: string;
  detail?: string;
  edit?: { label: string; disabled: boolean; onPress: () => void };
  actions: IGridSelectionAction[];
}

export function GridSelectionSummary_build(payload: IGridSelectionPayload): IGridSelectionSummary {
  const target = payload.target;

  const single = target.kind === "exercises" && target.placements.length === 1 ? target.placements[0] : undefined;
  const label =
    target.kind === "day" || target.kind === "week"
      ? target.name
      : target.placements.map((p) => `${p.fullName}${ProgramGrid_orderSuffix(p)}`).join(", ");
  const description =
    target.kind === "week" || target.kind === "day" ? target.description : (single?.description ?? undefined);
  const detailsKey =
    target.kind === "week"
      ? `week-${target.weekIndex}`
      : target.kind === "day"
        ? `day-${target.rowIndexes.join("-")}`
        : single?.id;
  const badges: string[] = [];
  if (single != null) {
    if (single.notused) {
      badges.push(single.isTemplate ? "tmpl" : "unused");
    }
    if (single.tags.length > 0) {
      badges.push(`id ${single.tags.join(", ")}`);
    }
  }

  // An action that doesn't apply is left out rather than shown greyed: a menu is read as a list of
  // what you can do, and a disabled row in one is a worse answer than a shorter list.
  const actions: IGridSelectionAction[] = [];
  let edit: IGridSelectionSummary["edit"];
  if (target.kind === "week") {
    edit = { label: "Edit week", disabled: false, onPress: () => payload.onEditWeek(target.weekIndex) };
    actions.push({ label: "Week stats", onPress: () => payload.onShowWeekStats(target.weekIndex) });
    actions.push({ label: "Duplicate week", onPress: () => payload.onDuplicateWeek(target.weekIndex) });
    actions.push({ label: "Delete week", isDestructive: true, onPress: () => payload.onDeleteWeek(target.weekIndex) });
  } else if (target.kind === "day") {
    const rowIndexes = target.rowIndexes;
    const singleRow = rowIndexes.length === 1 ? rowIndexes[0] : undefined;
    edit = {
      label: "Edit day",
      disabled: singleRow == null,
      onPress: () => {
        if (singleRow != null) {
          payload.onEditDay(singleRow);
        }
      },
    };
    if (singleRow != null) {
      actions.push({ label: "Day stats", onPress: () => payload.onShowDayStats(singleRow) });
    }
    actions.push({
      label: `Duplicate ${StringUtils_pluralize("day", rowIndexes.length)}`,
      onPress: () => payload.onDuplicateDays(rowIndexes),
    });
    actions.push({
      label: `Delete ${StringUtils_pluralize("day", rowIndexes.length)}`,
      isDestructive: true,
      onPress: () => payload.onDeleteDays(rowIndexes),
    });
  } else {
    const placements = target.placements;
    const onEdit = payload.onEdit;
    edit =
      onEdit != null
        ? {
            label: "Edit",
            disabled: single == null,
            onPress: () => {
              if (single != null) {
                onEdit(single);
              }
            },
          }
        : undefined;
    if (single != null) {
      actions.push({ label: "Exercise stats", onPress: () => payload.onShowExerciseStats(single) });
      actions.push({ label: "Swap exercise", onPress: () => payload.onSwap(single) });
      actions.push({ label: "Duplicate exercise", onPress: () => payload.onDuplicate(single) });
    }
    actions.push({
      label: `Delete ${StringUtils_pluralize("exercise", placements.length)}`,
      isDestructive: true,
      onPress: () => payload.onDelete(placements),
    });
  }

  return { label, detailsKey, badges, description, detail: single?.progression, edit, actions };
}
