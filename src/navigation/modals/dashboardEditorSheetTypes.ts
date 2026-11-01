import type { ILiftographDiagnostic } from "../../liftograph/liftographDocument";
import type { LiftographEditorAnalysis } from "../../liftograph/liftographEditorAnalysis";

export interface IDashboardEditorSheetProps {
  initialText: string;
  title: string;
  analysis: LiftographEditorAnalysis;
  diagnostics: ILiftographDiagnostic[];
  onTextChange: (text: string) => void;
  onCancel: () => void;
  onSave: (text: string) => void;
}
