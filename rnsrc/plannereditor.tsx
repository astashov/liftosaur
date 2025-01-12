import { createRoot } from "react-dom/client";
import { PlannerEditorView } from "../src/pages/planner/components/plannerEditorView";
import { PlannerSyntaxError } from "../src/pages/planner/plannerExerciseEvaluator";
import { IAllCustomExercises } from "../src/types";

interface IProps {
  name: string;
  error: PlannerSyntaxError;
  lineNumbers: boolean;
  customExercises: IAllCustomExercises;
  exerciseFullNames: string[];
  value?: string;
}

async function main(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: IProps = (window as any).appState as IProps;
  createRoot(document.getElementById("app")!).render(
    <PlannerEditorView
      name={props.name}
      error={props.error}
      lineNumbers={props.lineNumbers}
      customExercises={props.customExercises}
      exerciseFullNames={props.exerciseFullNames}
      value={props.value}
      onBlur={() => {
        console.log("onBlur");
      }}
      onChange={(newValue: string) => {
        console.log("onChange", newValue);
      }}
      onLineChange={(newValue: number) => {
        console.log("onLineChange", newValue);
      }}
    />
  );
}

main();
