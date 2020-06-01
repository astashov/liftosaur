import { h, JSX } from "preact";
import { Program, IProgramId } from "../models/program";

interface IProps {
  onClick: (id: IProgramId) => void;
}

export function ProgramListView(props: IProps): JSX.Element {
  return (
    <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
      {Program.all().map((program) => (
        <button className="w-full p-4 border-b border-gray-200" onClick={() => props.onClick(program.id)}>
          {program.name}
        </button>
      ))}
    </section>
  );
}
