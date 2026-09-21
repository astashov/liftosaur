import { createContext } from "react";

export const WorkoutPagerHeightContext = createContext<((entryIndex: number, height: number) => void) | undefined>(
  undefined
);
