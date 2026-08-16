import type { IEvaluatedProgram } from "../../models/program";
import type { PlannerSyntaxError } from "../../pages/planner/plannerExerciseEvaluator";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import type { IDayData, IExerciseType, ISettings } from "../../types";

export interface IDayLiftoEditorSheetProps {
  initialText: string;
  headerLabel: string;
  settings: ISettings;
  // The program as of the host's last evaluation of this draft, and this day's exercises out
  // of it — what the pills resolve reuse targets and state vars against.
  evaluatedProgram: IEvaluatedProgram;
  dayData: Required<IDayData>;
  exercises: IPlannerProgramExercise[];
  // Offsets are relative to this day's document, which is exactly what the editor holds, so
  // its own line numbering is what the message refers to.
  error?: PlannerSyntaxError;
  // Equipment for weight stepping. Answered without an offset because the controller asks
  // while focus is crossing into the exercise, before the body has re-rendered.
  exerciseTypeFor: (exerciseFullName: string) => IExerciseType | undefined;
  // Autocomplete source for the web CodeMirror body; the native structured editor gets
  // exercise names through its own picker instead.
  exerciseFullNames: string[];
  onTextChange: (text: string) => void;
  // Freeform turns the swipe gestures off, so the hint the sheet shows below itself would be
  // wrong there.
  onModeChange?: (mode: "structured" | "freeform") => void;
  onDone: (text: string) => void;
}
