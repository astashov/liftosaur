// Import pre-built content
import liftoscriptDoc from "../generated/liftoscriptDoc";
import liftoscriptExamples from "../generated/liftoscriptExamples";
import exercises from "../generated/exercises";
import plannerGrammar from "../generated/plannerGrammar";
import liftoscriptGrammar from "../generated/liftoscriptGrammar";

export function LiftoscriptDocs_getMainDoc(): string {
  return liftoscriptDoc;
}

export function LiftoscriptDocs_getExamplesDoc(): string {
  return liftoscriptExamples;
}

export function LiftoscriptDocs_getExercises(): string {
  return exercises;
}

export function LiftoscriptDocs_getCombinedDocs(): string {
  return `${liftoscriptDoc}\n\n${exercises}\n\n${liftoscriptExamples}`;
}

export function LiftoscriptDocs_getPlannerGrammar(): string {
  return `# Liftoscript Grammar:

This is Lezer Grammar describing the Liftoscript syntax:

${plannerGrammar}
`;
}

export function LiftoscriptDocs_getLiftoscriptGrammar(): string {
  return `# Progress/Update scripts Grammar:

This is Lezer Grammar describing the Progress and Update blocks syntax:

${liftoscriptGrammar}
`;
}
