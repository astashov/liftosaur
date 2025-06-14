import "../utils/markdownLoader";

import liftoscriptDoc from "../../llms/liftoscript.md";
import liftoscriptExamples from "../../llms/liftoscript_examples.md";
import plannerGrammar from "../pages/planner/plannerExercise.grammar";
import liftoscriptGrammar from "../../liftoscript.grammar";

export class LiftoscriptDocs {
  public static getMainDoc(): string {
    return liftoscriptDoc;
  }

  public static getExamplesDoc(): string {
    return liftoscriptExamples;
  }

  public static getCombinedDocs(): string {
    return `${liftoscriptDoc}\n\n${liftoscriptExamples}`;
  }

  public static getPlannerGrammar(): string {
    return `# Liftoscript Grammar:

This is Lezer Grammar describing the Liftoscript syntax:

${plannerGrammar}
`;
  }

  public static getLiftoscriptGrammar(): string {
    return `# Progress/Update scripts Grammar:

This is Lezer Grammar describing the Progress and Update blocks syntax:

${liftoscriptGrammar}
`;
  }
}
