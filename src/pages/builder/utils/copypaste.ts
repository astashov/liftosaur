import { lb } from "lens-shmens";
import { useEffect } from "preact/hooks";
import { IBuilderState, IBuilderDispatch } from "../models/builderReducer";
import { IBuilderDay, IBuilderExercise, IBuilderWeek } from "../models/types";

type ICopyPaste =
  | { type: "week"; week: IBuilderWeek }
  | { type: "day"; day: IBuilderDay }
  | { type: "exercise"; exercise: IBuilderExercise };

export function useCopyPaste(state: IBuilderState, dispatch: IBuilderDispatch): void {
  useEffect(() => {
    function onCopy(): void {
      const selected = state.ui.selectedExercise;
      if (selected) {
        navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
          if (result.state === "granted" || result.state === "prompt") {
            let copypaste: ICopyPaste;
            if (selected.exerciseIndex != null && selected.dayIndex != null) {
              const exercise =
                state.program.weeks[selected.weekIndex].days[selected.dayIndex].exercises[selected.exerciseIndex];
              copypaste = { type: "exercise", exercise };
            } else if (selected.dayIndex != null) {
              const day = state.program.weeks[selected.weekIndex].days[selected.dayIndex];
              copypaste = { type: "day", day };
            } else {
              const week = state.program.weeks[selected.weekIndex];
              copypaste = { type: "week", week };
            }
            navigator.clipboard.writeText(JSON.stringify(copypaste));
          }
        });
      }
    }

    function onPaste(): void {
      const selectedExercise = state.ui.selectedExercise;
      if (!selectedExercise) {
        return;
      }
      navigator.permissions.query({ name: "clipboard-read" }).then((result) => {
        if (result.state === "granted" || result.state === "prompt") {
          navigator.clipboard.readText().then(
            (clipText) => {
              const copypaste: ICopyPaste = JSON.parse(clipText);
              const weekIndex = selectedExercise.weekIndex;
              const week = state.program.weeks[weekIndex];
              const dayIndex = selectedExercise.dayIndex || week.days.length - 1;
              const day = week.days[dayIndex];
              const exerciseIndex = selectedExercise.exerciseIndex || day.exercises.length - 1;
              switch (copypaste.type) {
                case "week": {
                  dispatch([
                    lb<IBuilderState>()
                      .p("program")
                      .p("weeks")
                      .recordModify((weeks) => {
                        const newWeeks = [...weeks];
                        newWeeks.splice(weekIndex + 1, 0, copypaste.week);
                        return newWeeks;
                      }),
                    lb<IBuilderState>()
                      .p("ui")
                      .p("selectedExercise")
                      .record({ weekIndex: weekIndex + 1 }),
                  ]);
                  break;
                }
                case "day": {
                  dispatch([
                    lb<IBuilderState>()
                      .p("program")
                      .p("weeks")
                      .i(weekIndex)
                      .p("days")
                      .recordModify((days) => {
                        const newDays = [...days];
                        newDays.splice(dayIndex + 1, 0, copypaste.day);
                        return newDays;
                      }),
                    lb<IBuilderState>()
                      .p("ui")
                      .p("selectedExercise")
                      .record({ weekIndex, dayIndex: dayIndex + 1 }),
                  ]);
                  break;
                }
                case "exercise": {
                  dispatch([
                    lb<IBuilderState>()
                      .p("program")
                      .p("weeks")
                      .i(weekIndex)
                      .p("days")
                      .i(dayIndex)
                      .p("exercises")
                      .recordModify((exercises) => {
                        const newExercises = [...exercises];
                        newExercises.splice(exerciseIndex + 1, 0, copypaste.exercise);
                        return newExercises;
                      }),
                    lb<IBuilderState>()
                      .p("ui")
                      .p("selectedExercise")
                      .record({ weekIndex, dayIndex, exerciseIndex: exerciseIndex + 1 }),
                  ]);
                  break;
                }
              }
            },
            () => {
              console.log("Failed to paste from clipboard!");
            }
          );
        }
      });
      console.log(state);
    }
    window.removeEventListener("copy", onCopy);
    window.removeEventListener("paste", onPaste);
    window.addEventListener("copy", onCopy);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("paste", onPaste);
    };
  }, [state]);
}
