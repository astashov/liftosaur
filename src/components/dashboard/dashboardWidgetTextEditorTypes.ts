import type { ReactNode } from "react";
import type { ILiftographDiagnostic } from "../../liftograph/liftographDocument";
import type { LiftographEditorAnalysis } from "../../liftograph/liftographEditorAnalysis";

export interface IDashboardWidgetTextEditorProps {
  header: ReactNode;
  isHeaderPinned: boolean;
  text: string;
  analysis: LiftographEditorAnalysis;
  diagnostics: ILiftographDiagnostic[];
  notice?: string;
  onChange: (text: string) => void;
}
