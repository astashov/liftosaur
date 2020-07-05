import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { ProgramListView } from "./programList";
import { useState } from "preact/hooks";
import { IProgramId, IProgram2 } from "../models/program";
import { ModalProgramInfo } from "./modalProgramInfo";
import { ModalCreateProgram } from "./modalCreateProgram";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram2[];
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [selectedProgramId, useSelectedProgramId] = useState<IProgramId | undefined>(undefined);
  const [shouldCreateProgram, useShouldCreateProgram] = useState<boolean>(false);

  return (
    <section className="h-full">
      <HeaderView title="Choose a program" />
      <ProgramListView
        onSelectProgram={(programId) => useSelectedProgramId(programId)}
        onCreateProgram={() => useShouldCreateProgram(true)}
        programs={props.programs}
        dispatch={props.dispatch}
      />
      {selectedProgramId != null && (
        <ModalProgramInfo
          programId={selectedProgramId}
          onClose={() => useSelectedProgramId(undefined)}
          onSelect={() => props.dispatch({ type: "ChangeProgramAction", name: selectedProgramId })}
        />
      )}
      {shouldCreateProgram && (
        <ModalCreateProgram
          onClose={() => useShouldCreateProgram(false)}
          onSelect={(name) => {
            props.dispatch({ type: "CreateProgramAction", name });
          }}
        />
      )}
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
