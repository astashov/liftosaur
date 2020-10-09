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
import { ModalPostClone } from "./modalPostClone";
import { ISettings } from "../models/settings";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  settings: ISettings;
  customPrograms: IProgram[];
  screenStack: IScreen[];
  editProgramId?: string;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>(undefined);
  const [shouldCreateProgram, setShouldCreateProgram] = useState<boolean>(false);
  const [shouldShowPostCloneModal, setShouldShowPostCloneModal] = useState<boolean>(false);

  const program = props.programs.find((p) => p.id === selectedProgramId);

  return (
    <section className="h-full">
      <HeaderView
        left={
          props.screenStack.length > 1 ? (
            <button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>
          ) : undefined
        }
        right={
          <button className="p-4" onClick={() => setShouldCreateProgram(true)}>
            Create
          </button>
        }
        title="Choose a program"
      />
      <ProgramListView
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
            if (program.id === "the5314b") {
              setShouldShowPostCloneModal(true);
            } else {
              props.dispatch(Thunk.pushScreen("main"));
            }
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
      {shouldShowPostCloneModal && program && (
        <ModalPostClone
          settings={props.settings}
          programIndex={props.customPrograms.indexOf(program)}
          program={program}
          onClose={() => props.dispatch(Thunk.pushScreen("main"))}
          dispatch={props.dispatch}
        />
      )}
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
