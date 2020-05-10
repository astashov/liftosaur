import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { ProgramListView } from "./programList";
import { useState } from "preact/hooks";
import { IProgramId } from "../models/program";
import { ModalProgramInfo } from "./modalProgramInfo";

interface IProps {
  dispatch: IDispatch;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [selectedProgramId, useSelectedProgramId] = useState<IProgramId | undefined>(undefined);

  return (
    <section className="flex flex-col h-full">
      <HeaderView title="Choose a program" />
      <ProgramListView onClick={(programId) => useSelectedProgramId(programId)} />
      {selectedProgramId != null && (
        <ModalProgramInfo
          programId={selectedProgramId}
          onClose={() => useSelectedProgramId(undefined)}
          onSelect={() => props.dispatch({ type: "ChangeProgramAction", name: selectedProgramId })}
        />
      )}
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
