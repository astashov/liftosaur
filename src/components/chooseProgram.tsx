import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { ProgramListView } from "./programList";
import { useState } from "preact/hooks";
import { IProgram, Program } from "../models/program";
import { ModalCreateProgram } from "./modalCreateProgram";
import { ModalProgramInfo } from "./modalProgramInfo";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  customPrograms: IProgram[];
  editProgramId?: string;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>(undefined);
  const [shouldCreateProgram, setShouldCreateProgram] = useState<boolean>(false);

  const program = props.programs.find((p) => p.id === selectedProgramId);

  return (
    <section className="h-full">
      <HeaderView title="Choose a program" />
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
