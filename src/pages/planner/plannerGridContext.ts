import { createContext, JSX } from "react";
import type { IPlannerGridProps } from "./components/plannerGrid";

export type IPlannerGridComponent = (props: IPlannerGridProps) => JSX.Element;

// Provided only by the browser entries. The lambda bundle compiles every static import of the
// page, so the grid (and react-native-reanimated) stays out of it by never being imported here.
export const PlannerGridContext = createContext<IPlannerGridComponent | undefined>(undefined);
