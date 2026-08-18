import { createContext, JSX, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { IProgramGridPlacement } from "../../pages/planner/models/programGrid";

// What the grid's current selection offers. The grid publishes it because that is where the program,
// settings and dispatch live; the dock only renders it, from NavScreenContent's footer slot so it
// sits above the tab bar instead of scrolling away with the row that was tapped.
export interface IGridSelectionPayload {
  placements: IProgramGridPlacement[];
  onEdit: (placement: IProgramGridPlacement) => void;
  onDuplicate: (placement: IProgramGridPlacement) => void;
  onDelete: (placements: IProgramGridPlacement[]) => void;
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
