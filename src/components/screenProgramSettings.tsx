import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgramId, Program } from "../models/program";
import { The5314bProgramSettings } from "../models/programs/components/the5314bProgram/settings";

interface IProps {
  dispatch: IDispatch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programStates: Record<string, any>;
  programId: IProgramId;
}

export function ScreenProgramSettings(props: IProps): JSX.Element | null {
  const program = Program.get(props.programId);
  const state = props.programStates[props.programId];
  if (props.programId === "the5314b") {
    return <The5314bProgramSettings dispatch={props.dispatch} programId={program.id} state={state} />;
  }
  return null;
}
