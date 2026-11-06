import type { ReactNode } from "react";
import type { ILiftographDiagnostic } from "../../liftograph/liftographDocument";
import type { LiftographEditorAnalysis } from "../../liftograph/liftographEditorAnalysis";

export interface IDashboardTextEditorProps {
  header: ReactNode;
  text: string;
  initialCaret?: number;
  analysis: LiftographEditorAnalysis;
  diagnostics: ILiftographDiagnostic[];
  onChange: (text: string) => void;
}
