import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { Program } from "../models/program";

interface IProps {
  dispatch: IDispatch;
}

export function ProgramListView(props: IProps): JSX.Element {
  return (
    <Fragment>
      {Program.all().map(program => (
        <button
          className="border-gray-200 border-b p-4"
          onClick={() => props.dispatch({ type: "ChangeProgramAction", name: program.id })}
        >
          {program.name}
        </button>
      ))}
    </Fragment>
  );
}
