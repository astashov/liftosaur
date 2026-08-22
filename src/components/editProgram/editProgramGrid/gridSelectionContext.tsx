import { createContext, JSX, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { IProgramGridPlacement } from "../../../pages/planner/models/programGrid";

// What the grid's current selection offers. The grid publishes it because that is where the program,
// settings and dispatch live; the dock only renders it, from NavScreenContent's footer slot so it
// sits above the tab bar instead of scrolling away with the row that was tapped.
// A selected day is a day, not the bag of exercises inside it: its actions restructure the program
// (and do so across every week), while exercise actions edit content. Same dock, different verbs.
export type IGridSelectionTarget =
  | { kind: "exercises"; placements: IProgramGridPlacement[] }
  | { kind: "day"; rowIndexes: number[]; name: string; placements: IProgramGridPlacement[] }
  | { kind: "week"; weekIndex: number; name: string; dayCount: number; exerciseCount: number };

export interface IGridSelectionPayload {
  target: IGridSelectionTarget;
  onEdit: (placement: IProgramGridPlacement) => void;
  onDuplicate: (placement: IProgramGridPlacement) => void;
  onDelete: (placements: IProgramGridPlacement[]) => void;
  onDuplicateDays: (rowIndexes: number[]) => void;
  onDeleteDays: (rowIndexes: number[]) => void;
  onDuplicateWeek: (weekIndex: number) => void;
  onDeleteWeek: (weekIndex: number) => void;
  onClear: () => void;
}

interface IGridSelectionContextValue {
  payload?: IGridSelectionPayload;
  publish: (payload: IGridSelectionPayload | undefined) => void;
}

const GridSelectionContext = createContext<IGridSelectionContextValue>({ publish: () => undefined });

export function GridSelectionProvider(props: { children: ReactNode }): JSX.Element {
  const [payload, setPayload] = useState<IGridSelectionPayload | undefined>(undefined);
  const publish = useCallback((next: IGridSelectionPayload | undefined) => setPayload(next), []);
  const value = useMemo(() => ({ payload, publish }), [payload, publish]);
  return <GridSelectionContext.Provider value={value}>{props.children}</GridSelectionContext.Provider>;
}

export function useGridSelectionPublish(): (payload: IGridSelectionPayload | undefined) => void {
  return useContext(GridSelectionContext).publish;
}

export function useGridSelection(): IGridSelectionPayload | undefined {
  return useContext(GridSelectionContext).payload;
}
