import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { ProgramListView } from "./programList";
import { useState } from "preact/hooks";
import { Program } from "../models/program";
import { ModalCreateProgram } from "./modalCreateProgram";
import { ModalProgramInfo } from "./modalProgramInfo";
import { Thunk } from "../ducks/thunks";
import { IScreen } from "../models/screen";
import { ModalPostClone } from "./modalPostClone";
import { IProgram, ISettings } from "../types";
import { ILoading } from "../models/state";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { Surface } from "./surface";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  loading: ILoading;
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
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          title="Choose a program"
          dispatch={props.dispatch}
          onHelpClick={() => {}}
          screenStack={props.screenStack}
        />
      }
      footer={
        <Footer2View
          dispatch={props.dispatch}
          onCtaClick={() => setShouldCreateProgram(true)}
          ctaTitle="Create Program"
        />
      }
      addons={
        <Fragment>
          {program != null && (
            <ModalProgramInfo
              program={program}
              hasCustomPrograms={props.customPrograms.length > 0}
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
        </Fragment>
      }
    >
      <ProgramListView
        onSelectProgram={(id) => setSelectedProgramId(id)}
        programs={props.programs}
        customPrograms={props.customPrograms}
        dispatch={props.dispatch}
        editProgramId={props.editProgramId}
      />
    </Surface>
  );
}
