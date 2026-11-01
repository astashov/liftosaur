import { ILiftoEditorStyledRange, LiftoEditorParseCache } from "../components/primitives/liftoEditorBrain";
import { ISettings } from "../types";
import { LiftographCompile_document } from "./liftographCompile";
import { ILiftographDiagnostic, ILiftographDocument, LiftographDocument_parse } from "./liftographDocument";
import { LiftographHighlight_styledRanges } from "./liftographHighlight";

export class LiftographEditorAnalysis {
  private readonly cache = new LiftoEditorParseCache();
  private last: ILiftographDocument | undefined;

  constructor(private readonly settings: ISettings) {}

  public document(text: string): ILiftographDocument {
    if (this.last?.text !== text) {
      this.last = LiftographDocument_parse(text);
    }
    return this.last;
  }

  public styledRanges(text: string): ILiftoEditorStyledRange[] {
    const doc = this.document(text);
    return LiftographHighlight_styledRanges(doc, this.cache, doc.diagnostics);
  }

  public compileDiagnostics(text: string): ILiftographDiagnostic[] {
    return LiftographCompile_document(this.document(text), this.settings).diagnostics;
  }
}
