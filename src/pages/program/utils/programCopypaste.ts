import { lb } from "lens-shmens";
import { useEffect } from "preact/hooks";
import { IProgramEditorState, IProgramEditorUiSelected } from "../models/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { ICustomExercise, IEquipmentData, IProgramExercise } from "../../../types";
import { Program } from "../../../models/program";
import { ProgramExercise } from "../../../models/programExercise";
import { ClipboardUtils } from "../../../utils/clipboard";

type ICopyPaste = {
  app: "program";
  type: "exercise";
  exercise: IProgramExercise;
  customExercise?: ICustomExercise;
  customEquipment?: { id: string; data: IEquipmentData };
};

export function useCopyPaste(state: IProgramEditorState, dispatch: ILensDispatch<IProgramEditorState>): void {
  useEffect(() => {
    function onCopy(): void {
      const selectedExercises = state.ui.selected;
      if (!window.disableCopying && !window.getSelection()?.toString() && selectedExercises.length > 0) {
        const copypaste: ICopyPaste[] = [];
        const program = state.current.program;
        for (const selected of selectedExercises) {
          const programExercise = Program.getProgramExercise(program, selected.exerciseId);
          if (programExercise != null) {
            const resolvedProgramExercise = ProgramExercise.resolveProgramExercise(programExercise, program.exercises);
            const customExercise: ICustomExercise | undefined =
              state.settings.exercises[programExercise.exerciseType.id];
            const exerciseEquipment = programExercise.exerciseType.equipment;
            const equipment = exerciseEquipment ? state.settings.equipment[exerciseEquipment] : undefined;
            const customEquipment = equipment?.name ? { id: exerciseEquipment!, data: equipment! } : undefined;

            copypaste.push({
              app: "program",
              type: "exercise",
              exercise: resolvedProgramExercise,
              customExercise,
              customEquipment,
            });
          }
        }
        ClipboardUtils.copy(JSON.stringify(copypaste));
      }
    }

    function onPaste(): void {
      ClipboardUtils.paste().then(
        (clipText) => {
          if (!clipText) {
            return;
          }
          let copypastes: ICopyPaste[] = [];
          try {
            copypastes = JSON.parse(clipText);
          } catch (e) {
            return;
          }
          if (!Array.isArray(copypastes) || copypastes.some((c) => c.app !== "program")) {
            return;
          }
          const selectedExercise = state.ui.selected[state.ui.selected.length - 1];
          const dayIndex = selectedExercise?.dayIndex;
          const selectedIndex =
            dayIndex != null
              ? state.current.program.days[dayIndex].exercises.findIndex((e) => e.id === selectedExercise.exerciseId)
              : undefined;
          const newSelection: IProgramEditorUiSelected[] = [];
          for (const copypaste of copypastes || []) {
            const id = copypaste.exercise.id;

            const customExercise = copypaste.customExercise;
            if (customExercise) {
              const existingCustomExercise = state.settings.exercises[customExercise.id];
              if (!existingCustomExercise) {
                dispatch(
                  lb<IProgramEditorState>()
                    .p("settings")
                    .p("exercises")
                    .recordModify((exercises) => ({
                      ...exercises,
                      [customExercise.id]: customExercise,
                    }))
                );
              }
            }
            const customEquipment = copypaste.customEquipment;
            if (customEquipment) {
              const existingCustomEquipment = state.settings.equipment[customEquipment.id];
              if (!existingCustomEquipment) {
                dispatch(
                  lb<IProgramEditorState>()
                    .p("settings")
                    .p("equipment")
                    .recordModify((equipment) => ({
                      ...equipment,
                      [customEquipment.id]: customEquipment.data,
                    }))
                );
              }
            }

            const existingExercise = Program.getProgramExercise(state.current.program, id);
            if (!existingExercise) {
              dispatch(
                lb<IProgramEditorState>()
                  .p("current")
                  .p("program")
                  .p("exercises")
                  .recordModify((exercises) => [...exercises, copypaste.exercise])
              );
            }
            if (dayIndex != null) {
              dispatch(
                lb<IProgramEditorState>()
                  .p("current")
                  .p("program")
                  .p("days")
                  .i(dayIndex)
                  .p("exercises")
                  .recordModify((exercises) => {
                    const newExercises = [...exercises];
                    const hasExercise = newExercises.some((e) => e.id === id);
                    if (hasExercise) {
                      return exercises;
                    }
                    if (selectedIndex != null) {
                      newExercises.splice(selectedIndex + 1, 0, { id });
                    } else {
                      newExercises.push({ id });
                    }
                    return newExercises;
                  })
              );
              newSelection.push({ dayIndex, exerciseId: id });
            } else if (!existingExercise) {
              newSelection.push({ exerciseId: id });
            }
          }
          dispatch(lb<IProgramEditorState>().p("ui").p("selected").record(newSelection));
        },
        () => {
          console.log("Failed to paste from clipboard!");
        }
      );
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
