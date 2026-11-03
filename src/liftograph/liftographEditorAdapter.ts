import type { IEditorToken, ILiftoEditorContext } from "../components/primitives/liftoEditorBrain";
import type { ILiftoEditorPill } from "../components/primitives/liftoEditorActions";
import type { ILiftoEditorAdapter, ILiftoEditorEditPlan } from "../components/primitives/liftoEditorAdapter";
import { ILiftographDocument } from "./liftographDocument";
import { LiftographEditorAnalysis } from "./liftographEditorAnalysis";
import { LiftographRail_context } from "./liftographRail";
import * as T from "./liftographParser.terms";

const TOKEN_NODES = new Set([T.Key, T.Atoms, T.List, T.Quoted, T.ArgValue, T.TextLine, T.Script]);

export function LiftographEditorAdapter_tokens(doc: ILiftographDocument): IEditorToken[] {
  const tokens: IEditorToken[] = [];
  doc.tree.iterate({
    enter: (node) => {
      if (node.type.id === T.HiddenLine) {
        return false;
      }
      const isCallName = node.type.id === T.Identifier && node.node.parent?.type.id === T.Call;
      if (!TOKEN_NODES.has(node.type.id) && !isCallName) {
        return undefined;
      }
      if (node.to > node.from) {
        tokens.push({ start: node.from, end: node.to, text: doc.text.slice(node.from, node.to), walkStop: true });
      }
      return false;
    },
  });
  return tokens.sort((a, b) => a.start - b.start);
}

export function LiftographEditorAdapter_removal(
  context: ILiftoEditorContext,
  levelIndex: number
): ILiftoEditorEditPlan | undefined {
  const edits = context.levels[levelIndex]?.removeEdits;
  return edits != null && edits.length > 0 ? { edits } : undefined;
}

export class LiftographEditorAdapter implements ILiftoEditorAdapter {
  constructor(private readonly analysis: LiftographEditorAnalysis) {}

  public tokens(text: string): IEditorToken[] {
    return LiftographEditorAdapter_tokens(this.analysis.document(text));
  }

  public contextAt(text: string, index: number): ILiftoEditorContext {
    return LiftographRail_context(this.analysis.document(text), index, this.analysis.railArgs());
  }

  public canTap(): boolean {
    return true;
  }

  public canFreeform(): boolean {
    return true;
  }

  public railPills(_text: string, pills: ILiftoEditorPill[]): ILiftoEditorPill[] {
    return pills;
  }

  public removal(_text: string, context: ILiftoEditorContext, levelIndex: number): ILiftoEditorEditPlan | undefined {
    return LiftographEditorAdapter_removal(context, levelIndex);
  }
}
