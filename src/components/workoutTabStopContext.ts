import { createContext } from "react";

// Browser tabIndex for the set fields and the check on one pager page. Pages before the current
// one get -1, else the first Tab after the header lands on the previous exercise.
export const WorkoutTabStopContext = createContext<0 | -1>(0);
