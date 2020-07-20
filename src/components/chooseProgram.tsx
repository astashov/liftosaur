import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { ProgramListView } from "./programList";
import { useState } from "preact/hooks";
import { IProgram } from "../models/program";
import { ModalCreateProgram } from "./modalCreateProgram";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  customPrograms: IProgram[];
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [shouldCreateProgram, useShouldCreateProgram] = useState<boolean>(false);

  return (
    <section className="h-full">
      <HeaderView title="Choose a program" />
      <ProgramListView
        onCreateProgram={() => useShouldCreateProgram(true)}
        programs={props.programs}
        customPrograms={props.customPrograms}
        dispatch={props.dispatch}
      />
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
