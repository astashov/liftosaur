import type { IEditorToken, ILiftoEditorContext, ITextEdit } from "./liftoEditorBrain";
import type { ILiftoEditorPill } from "./liftoEditorActions";

export interface ILiftoEditorEditPlan {
  edits: ITextEdit[];
  focusAt?: number;
  freeformAt?: number;
}

export interface ILiftoEditorAdapter {
  tokens(text: string): IEditorToken[];
  contextAt(text: string, index: number): ILiftoEditorContext;
  canTap(text: string, index: number): boolean;
  canFreeform(text: string): boolean;
  railPills(text: string, pills: ILiftoEditorPill[]): ILiftoEditorPill[];
  removal(text: string, context: ILiftoEditorContext, levelIndex: number): ILiftoEditorEditPlan | undefined;
}
