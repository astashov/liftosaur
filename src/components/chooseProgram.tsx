import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { ProgramListView } from "./programList";
import { useState } from "preact/hooks";
import { Program } from "../models/program";
import { ModalCreateProgram } from "./modalCreateProgram";
import { ModalProgramInfo } from "./modalProgramInfo";
import { Thunk } from "../ducks/thunks";
import { IProgram, ISettings } from "../types";
import { INavCommon } from "../models/state";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { HelpChooseProgramFirstTime } from "./help/helpChooseProgramFirstTime";
import { HelpChooseProgram } from "./help/helpChooseProgram";
import { Button } from "./button";
import { Footer2View } from "./footer2";
import { ModalImportFromLink } from "./modalImportFromLink";
import { EditProgram } from "../models/editProgram";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  settings: ISettings;
  customPrograms: IProgram[];
  editProgramId?: string;
  navCommon: INavCommon;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>(undefined);
  const [shouldCreateProgram, setShouldCreateProgram] = useState<boolean>(false);
  const [showImportFromLink, setShowImportFromLink] = useState<boolean>(false);

  const program = props.programs.find((p) => p.id === selectedProgramId);
  const noPrograms = props.customPrograms.length === 0;

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          title="Choose a program"
          dispatch={props.dispatch}
          helpContent={noPrograms ? <HelpChooseProgramFirstTime /> : <HelpChooseProgram />}
        />
      }
      footer={noPrograms ? <></> : <Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
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
                Program.cloneProgram(props.dispatch, program, props.settings);
                props.dispatch(Thunk.pushScreen("main"));
              }}
            />
          )}
          <ModalCreateProgram
            isHidden={!shouldCreateProgram}
            onClose={() => setShouldCreateProgram(false)}
            onSelect={(name, isV2) => {
              if (isV2) {
                EditProgram.createExperimental(props.dispatch, name);
              } else {
                props.dispatch({ type: "CreateProgramAction", name });
              }
            }}
          />
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
