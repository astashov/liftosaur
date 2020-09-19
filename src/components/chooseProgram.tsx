import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { ProgramListView } from "./programList";
import { useState } from "preact/hooks";
import { IProgram, Program } from "../models/program";
import { ModalCreateProgram } from "./modalCreateProgram";
import { ModalProgramInfo } from "./modalProgramInfo";
import { Thunk } from "../ducks/thunks";
import { IScreen } from "../models/screen";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  customPrograms: IProgram[];
  screenStack: IScreen[];
  editProgramId?: string;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>(undefined);
  const [shouldCreateProgram, setShouldCreateProgram] = useState<boolean>(false);

  const program = props.programs.find((p) => p.id === selectedProgramId);

  return (
    <section className="h-full">
      <HeaderView
        left={
          props.screenStack.length > 1 ? (
            <button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>
          ) : undefined
        }
        title="Choose a program"
      />
      <ProgramListView
        onCreateProgram={() => setShouldCreateProgram(true)}
        onSelectProgram={(id) => setSelectedProgramId(id)}
        programs={props.programs}
        customPrograms={props.customPrograms}
        dispatch={props.dispatch}
        editProgramId={props.editProgramId}
      />
      {program != null && (
        <ModalProgramInfo
          program={program}
          onClose={() => setSelectedProgramId(undefined)}
          onSelect={() => {
            Program.cloneProgram(props.dispatch, program);
          }}
        />
      )}
      <ModalCreateProgram
        isHidden={!shouldCreateProgram}
        onClose={() => setShouldCreateProgram(false)}
        onSelect={(name) => {
          props.dispatch({ type: "CreateProgramAction", name });
        }}
      />
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
