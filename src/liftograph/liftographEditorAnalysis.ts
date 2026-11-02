import type { Tree } from "@lezer/common";
import type { ILiftoEditorStyledRange } from "../components/primitives/liftoEditorBrain";
import { ISettings } from "../types";
import { IncrementalParseCache, KeyedParseCache } from "../utils/incrementalParseCache";
import { parser as liftoscriptParser } from "../liftoscript";
import { parser as liftographParser } from "./liftographParser";
import { LiftographCompile_document } from "./liftographCompile";
import { ILiftographDiagnostic, ILiftographDocument, LiftographDocument_parse } from "./liftographDocument";
import { LiftographHighlight_styledRanges } from "./liftographHighlight";
import { PlannerCompletionsIndex } from "../pages/planner/plannerCompletions";
import { ILiftographCompletion, ILiftographCompletionHost, LiftographCompletions_at } from "./liftographCompletions";

export class LiftographEditorAnalysis {
  private readonly trees = new IncrementalParseCache(liftographParser);
  private readonly scriptTrees = new KeyedParseCache(liftoscriptParser);
  private readonly index = new PlannerCompletionsIndex();
  private last: ILiftographDocument | undefined;

  constructor(private readonly settings: ISettings) {}

  public document(text: string, tree?: Tree): ILiftographDocument {
    if (this.last?.text !== text || (tree != null && this.last.tree !== tree)) {
      this.last = LiftographDocument_parse(text, tree ?? this.trees.parse(text));
    }
    return this.last;
  }

  public scriptTree(script: string): Tree {
    return this.scriptTrees.parse(script);
  }

  public styledRanges(text: string, tree?: Tree): ILiftoEditorStyledRange[] {
    const doc = this.document(text, tree);
    return LiftographHighlight_styledRanges(doc, (script) => this.scriptTree(script), doc.diagnostics);
  }

  public completions(
    text: string,
    pos: number,
    host: ILiftographCompletionHost,
    explicit?: boolean,
    tree?: Tree
  ): ILiftographCompletion | undefined {
    return LiftographCompletions_at(text, pos, {
      doc: this.document(text, tree),
      settings: this.settings,
      index: this.index,
      scriptTrees: (script) => this.scriptTree(script),
      host,
      explicit,
    });
  }

  public compileDiagnostics(text: string): ILiftographDiagnostic[] {
    return LiftographCompile_document(this.document(text), this.settings).diagnostics;
  }
}
