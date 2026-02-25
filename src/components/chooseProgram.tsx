import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, IProgram, ISettings } from "../types";
import { INavCommon } from "../models/state";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { BuiltinProgramsList } from "./builtinProgramsList";
import { LinkButton } from "./linkButton";
import { ModalImportFromLink } from "./modalImportFromLink";
import { useState } from "preact/hooks";
import { Thunk_importFromLink } from "../ducks/thunks";
import { ModalCreateProgram } from "./modalCreateProgram";
import { EditProgram_create } from "../models/editProgram";
import { CustomProgramsList } from "./customProgramsList";
import { ScrollableTabs } from "./scrollableTabs";
import { emptyProgramId, IProgramIndexEntry, Program_selectProgram } from "../models/program";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  programsIndex: IProgramIndexEntry[];
  progress?: IHistoryRecord;
  settings: ISettings;
  customPrograms: IProgram[];
  editProgramId?: string;
  navCommon: INavCommon;
}

export function ChooseProgramView(props: IProps): JSX.Element {
  const [shouldCreateProgram, setShouldCreateProgram] = useState<boolean>(false);
  const [showImportFromLink, setShowImportFromLink] = useState<boolean>(false);

  const builtinPrograms = (): JSX.Element => (
    <BuiltinProgramsList
      hasCustomPrograms={props.customPrograms.length > 0}
      programs={props.programs}
      programsIndex={props.programsIndex}
      settings={props.settings}
      dispatch={props.dispatch}
    />
  );
  const customPrograms = (): JSX.Element => (
    <CustomProgramsList
      progress={props.progress}
      programs={props.customPrograms}
      settings={props.settings}
      dispatch={props.dispatch}
    />
  );

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          title="Choose a program"
          dispatch={props.dispatch}
          rightButtons={[
            <LinkButton
              className="px-2 text-sm no-underline"
              name="import-program"
              onClick={() => setShowImportFromLink(true)}
            >
              Import
            </LinkButton>,
          ]}
        />
      }
      footer={
        <Footer
          onCreate={() => setShouldCreateProgram(true)}
          onEmpty={() => {
            Program_selectProgram(props.dispatch, emptyProgramId);
          }}
        />
      }
      addons={
        <>
          <ModalImportFromLink
            isHidden={!showImportFromLink}
            onSubmit={async (link) => {
              if (link) {
                props.dispatch(Thunk_importFromLink(link));
              }
              setShowImportFromLink(false);
            }}
          />
          <ModalCreateProgram
            isHidden={!shouldCreateProgram}
            onClose={() => setShouldCreateProgram(false)}
            onSelect={(name) => {
              EditProgram_create(props.dispatch, name);
            }}
          />
        </>
      }
    >
      {props.customPrograms.length > 0 ? (
        <ScrollableTabs
          offsetY="3.5rem"
          nonSticky={true}
          topPadding="0"
          defaultIndex={0}
          tabs={[
            { label: "Yours", children: customPrograms },
            {
              label: "Built-in",
              children: builtinPrograms,
            },
          ]}
        />
      ) : (
        builtinPrograms()
      )}
    </Surface>
  );
}

interface IFooterProps {
  onCreate: () => void;
  onEmpty: () => void;
}

function Footer(props: IFooterProps): JSX.Element {
  return (
    <div
      className="fixed bottom-0 left-0 z-10 items-center w-full text-center pointer-events-none"
      style={{ marginBottom: "-2px" }}
    >
      <div
        className="box-content absolute flex footer-shadow bg-background-default safe-area-inset-bottom"
        style={{
          width: "4000px",
          marginLeft: "-2000px",
          left: "50%",
          height: "84px",
          bottom: "0",
        }}
      />
      <div className="safe-area-inset-bottom">
        <div className="box-content relative z-10 flex px-2 py-4 pointer-events-auto">
          <div className="flex items-stretch justify-around flex-1 gap-2">
            <button
              data-cy="create-program"
              className="flex items-center justify-center flex-1 text-sm font-semibold nm-create-program text-text-link"
              onClick={props.onCreate}
            >
              <div>Create New Program</div>
            </button>
            <div style={{ width: "1px" }} className="h-full bg-background-subtle" />
            <button className="flex-1 text-sm nm-empty-program" data-cy="empty-program" onClick={props.onEmpty}>
              <div className="font-semibold text-text-link">Go Without Program</div>
              <div className="text-xs text-gray-500">and build your program along the way</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
