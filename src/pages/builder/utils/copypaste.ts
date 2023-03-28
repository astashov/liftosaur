import { lb } from "lens-shmens";
import { useEffect } from "preact/hooks";
import { CollectionUtils } from "../../../utils/collection";
import { ObjectUtils } from "../../../utils/object";
import { IBuilderState, IBuilderDispatch } from "../models/builderReducer";
import { IBuilderDay, IBuilderExercise, IBuilderWeek } from "../models/types";

type ICopyPaste =
  | { app: "builder"; type: "week"; index: number; week: IBuilderWeek }
  | { app: "builder"; type: "day"; index: number; day: IBuilderDay }
  | { app: "builder"; type: "exercise"; index: number; exercise: IBuilderExercise };

export function useCopyPaste(state: IBuilderState, dispatch: IBuilderDispatch): void {
  useEffect(() => {
    function onCopy(): void {
      const selectedExercises = state.ui.selectedExercises;
      if (!window.getSelection()?.toString() && selectedExercises.length > 0) {
        navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
          if (result.state === "granted" || result.state === "prompt") {
            const copypaste: ICopyPaste[] = [];
            for (const selected of selectedExercises) {
              if (selected.exerciseIndex != null && selected.dayIndex != null) {
                const exercise =
                  state.current.program.weeks[selected.weekIndex].days[selected.dayIndex].exercises[
                    selected.exerciseIndex
                  ];
                copypaste.push({ app: "builder", type: "exercise", index: selected.exerciseIndex, exercise });
              } else if (selected.dayIndex != null) {
                const day = state.current.program.weeks[selected.weekIndex].days[selected.dayIndex];
                copypaste.push({ app: "builder", type: "day", index: selected.dayIndex, day });
              } else {
                const week = state.current.program.weeks[selected.weekIndex];
                copypaste.push({ app: "builder", type: "week", index: selected.weekIndex, week });
              }
            }
            navigator.clipboard.writeText(JSON.stringify(copypaste));
          }
        });
      }
    }

    function onPaste(): void {
      navigator.permissions.query({ name: "clipboard-read" }).then((result) => {
        if (result.state === "granted" || result.state === "prompt") {
          navigator.clipboard.readText().then(
            (clipText) => {
              let copypastes: ICopyPaste[] = [];
              try {
                copypastes = JSON.parse(clipText);
              } catch (e) {
                return;
              }
              if (!Array.isArray(copypastes) || copypastes.some((c) => c.app !== "builder")) {
                return;
              }
              const selectedExercise = state.ui.selectedExercises[state.ui.selectedExercises.length - 1];
              const weekIndex =
                selectedExercise?.weekIndex != null
                  ? selectedExercise.weekIndex
                  : state.current.program.weeks.length - 1;
              const week = state.current.program.weeks[weekIndex];
              const dayIndex = selectedExercise?.dayIndex != null ? selectedExercise.dayIndex : week.days.length - 1;
              const day = week.days[dayIndex];
              const exerciseIndex =
                selectedExercise?.exerciseIndex != null ? selectedExercise.exerciseIndex : day.exercises.length - 1;

              const a = CollectionUtils.groupByKey(copypastes, "type") as Record<string, ICopyPaste[]>;
              const sortedCopypastes = ObjectUtils.mapValues(a, (group: ICopyPaste[]) => {
                return CollectionUtils.sortBy(group, "index", true);
              });

              for (const type of ["exercise", "day", "week"]) {
                for (const copypaste of sortedCopypastes[type] || []) {
                  switch (copypaste.type) {
                    case "week": {
                      dispatch([
                        lb<IBuilderState>()
                          .p("current")
                          .p("program")
                          .p("weeks")
                          .recordModify((weeks) => {
                            const newWeeks = [...weeks];
                            newWeeks.splice(weekIndex + 1, 0, copypaste.week);
                            return newWeeks;
                          }),
                        lb<IBuilderState>()
                          .p("ui")
                          .p("selectedExercises")
                          .record([{ weekIndex: weekIndex + 1 }]),
                      ]);
                      break;
                    }
                    case "day": {
                      dispatch([
                        lb<IBuilderState>()
                          .p("current")
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
                          .p("selectedExercises")
                          .record([{ weekIndex, dayIndex: dayIndex + 1 }]),
                      ]);
                      break;
                    }
                    case "exercise": {
                      dispatch([
                        lb<IBuilderState>()
                          .p("current")
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
                          .p("selectedExercises")
                          .record([{ weekIndex, dayIndex, exerciseIndex: exerciseIndex + 1 }]),
                      ]);
                      break;
                    }
                  }
                }
              }
            },
            () => {
              console.log("Failed to paste from clipboard!");
            }
          );
        }
      });
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey || event.shiftKey || event.metaKey) {
        window.isPressingShiftCmdCtrl = true;
      }
    }

    function onKeyUp(event: KeyboardEvent): void {
      if (!(event.ctrlKey || event.shiftKey || event.metaKey)) {
        window.isPressingShiftCmdCtrl = false;
      }
    }

    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    window.removeEventListener("copy", onCopy);
    window.removeEventListener("paste", onPaste);
    window.addEventListener("copy", onCopy);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keypress", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [state]);
}
