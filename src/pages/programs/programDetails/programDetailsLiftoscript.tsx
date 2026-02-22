import { h, JSX } from "preact";
import { IProgram } from "../../../types";
import { PlannerProgram } from "../../planner/models/plannerProgram";
import { PlannerCodeBlock } from "../../planner/components/plannerCodeBlock";

interface IProps {
  program: IProgram;
}

export function ProgramDetailsLiftoscript(props: IProps): JSX.Element {
  const { program } = props;
  const weeks = program.planner?.weeks ?? [];
  const fullText = PlannerProgram.generateFullText(weeks);

  return (
    <div className="p-4 overflow-auto border rounded-lg border-border-neutral bg-background-card">
      <PlannerCodeBlock script={fullText} />
    </div>
  );
}
