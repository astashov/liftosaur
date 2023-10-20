import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { ProgramListView } from "./programList";
import { useState } from "preact/hooks";
import { Program } from "../models/program";
import { ModalCreateProgram } from "./modalCreateProgram";
import { ModalProgramInfo } from "./modalProgramInfo";
import { Thunk } from "../ducks/thunks";
import { IScreen, Screen } from "../models/screen";
import { ModalPostClone } from "./modalPostClone";
import { IProgram, ISettings } from "../types";
import { ILoading } from "../models/state";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { HelpChooseProgramFirstTime } from "./help/helpChooseProgramFirstTime";
import { HelpChooseProgram } from "./help/helpChooseProgram";
import { Button } from "./button";
import { Footer2View } from "./footer2";
import { ModalImportFromLink } from "./modalImportFromLink";

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
  const [showImportFromLink, setShowImportFromLink] = useState<boolean>(false);
  const [shouldShowPostCloneModal, setShouldShowPostCloneModal] = useState<boolean>(false);

  const program = props.programs.find((p) => p.id === selectedProgramId);
  const noPrograms = props.customPrograms.length === 0;

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          title="Choose a program"
          dispatch={props.dispatch}
          helpContent={noPrograms ? <HelpChooseProgramFirstTime /> : <HelpChooseProgram />}
          screenStack={props.screenStack}
        />
      }
      footer={noPrograms ? <></> : <Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
      addons={
        <Fragment>
          {program != null && (
            <ModalProgramInfo
              settings={props.settings}
              program={program}
              hasCustomPrograms={!noPrograms}
              onClose={() => setSelectedProgramId(undefined)}
              onPreview={() => Program.previewProgram(props.dispatch, program.id, false)}
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
          <ModalImportFromLink
            isHidden={!showImportFromLink}
            onSubmit={async (link) => {
              if (link) {
                props.dispatch(Thunk.importFromLink(link));
              }
              setShowImportFromLink(false);
            }}
          />
        </Fragment>
      }
    >
      <div className="pb-2 text-center">
        <Button
          name="create-program"
          buttonSize="md"
          className="mr-2"
          data-cy="create-program"
          kind="purple"
          onClick={() => setShouldCreateProgram(true)}
        >
          Create new program
        </Button>
        <Button
          name="import-program-from-link"
          buttonSize="md"
          data-cy="import-program-from-link"
          kind="orange"
          onClick={() => setShowImportFromLink(true)}
        >
          Import from link
        </Button>
      </div>
      <ProgramListView
        settings={props.settings}
        onSelectProgram={(id) => setSelectedProgramId(id)}
        programs={props.programs}
        customPrograms={props.customPrograms}
        dispatch={props.dispatch}
        editProgramId={props.editProgramId}
      />
    </Surface>
  );
}
