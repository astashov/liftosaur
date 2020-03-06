import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram } from "../models/program";

interface IProps {
  programs: IProgram[];
  dispatch: IDispatch;
}

export function ProgramListView(props: IProps): JSX.Element {
  return (
    <Fragment>
      {props.programs.map(program => (
        <button
          className="border-gray-200 border-b p-4"
          onClick={() => props.dispatch({ type: "ChangeProgramAction", name: program.name })}
        >
          {program.name}
        </button>
      ))}
    </Fragment>
  );
}
