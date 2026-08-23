// A superset group name is written into the program text as `superset: <name>`, and the grammar
// parses it as `ExerciseName { NonSeparator+ }`. A name holding one of NonSeparator's excluded
// characters doesn't just lose the superset - the whole day stops parsing and comes back empty.
export const PlannerNames_supersetNamePattern = "[^/{}()#\\[\\]|!]+";

export const PlannerNames_supersetNameMessage = "Name can't contain / { } ( ) # [ ] | !";
