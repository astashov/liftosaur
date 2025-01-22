import { h, JSX, Fragment } from "preact";
import { useLensReducer } from "../../utils/useLensReducer";
import { IProgramEditorState } from "./models/types";
import { IExportedProgram } from "../../models/program";
import { Settings } from "../../models/settings";
import { undoRedoMiddleware } from "../builder/utils/undoredo";
import { UidFactory } from "../../utils/generator";
import { ProgramPreview } from "../../components/programPreview";
import { ProgramContentEditor } from "./programContentEditor";
import { IconLink } from "../../components/icons/iconLink";
import { IconLogo } from "../../components/icons/iconLogo";
import { useEffect, useState } from "preact/hooks";
import { ClipboardUtils } from "../../utils/clipboard";
import { ProgramContentModalSettings } from "./components/programContentModalSettings";
import { IconCog2 } from "../../components/icons/iconCog2";
import { useCopyPaste } from "./utils/programCopypaste";
import { lb } from "lens-shmens";
import { Encoder } from "../../utils/encoder";
import { UrlUtils } from "../../utils/url";
import { ProgramContentExport } from "./utils/programContentExport";
import { IAccount } from "../../models/account";
import { MigrationBanner } from "../../components/migrationBanner";

export interface IProgramContentProps {
  client: Window["fetch"];
  isMobile: boolean;
  account?: IAccount;
  exportedProgram?: IExportedProgram;
  shouldSync: boolean;
}

declare let __HOST__: string;

export function ProgramContent(props: IProgramContentProps): JSX.Element {
  const defaultSettings = Settings.build();
  const programContentSettings = props.exportedProgram?.settings || Settings.programContentBuild();
  const initialSettings = {
    ...defaultSettings,
    ...programContentSettings,
    timers: { ...defaultSettings.timers, ...programContentSettings.timers },
    exercises: { ...defaultSettings.exercises, ...(props.exportedProgram?.customExercises || {}) },
  };
  const initialProgram = props.exportedProgram?.program || {
    id: UidFactory.generateUid(8),
    name: "My Program",
    url: "",
    author: "",
    shortDescription: "",
    description: "",
    nextDay: 1,
    isMultiweek: false,
    weeks: [],
    days: [{ id: UidFactory.generateUid(8), name: "Day 1", exercises: [] }],
    exercises: [],
    tags: [],
  };
  const initialState: IProgramEditorState = {
    ui: {
      selected: [],
    },
    settings: initialSettings,
    current: {
      program: initialProgram,
      editExercises: {},
    },
    history: {
      past: [],
      future: [],
    },
    initialEncodedProgramUrl: undefined,
    encodedProgramUrl: undefined,
  };

  const [state, dispatch] = useLensReducer(initialState, { client: props.client }, [
    async (action, oldState, newState) => {
      if (oldState.current.program !== newState.current.program || oldState.settings !== newState.settings) {
        const exportedProgram = ProgramContentExport.generateExportedProgram(newState);
        const baseUrl = UrlUtils.build("/program", window.location.href);
        const url = await Encoder.encodeIntoUrl(JSON.stringify(exportedProgram), baseUrl.toString());
        dispatch(lb<IProgramEditorState>().p("encodedProgramUrl").record(url.toString()));
      }
    },
    async (action, oldState, newState) => {
      if (
        !(
          "type" in action &&
          action.type === "Update" &&
          (action.desc === "undo" || action.desc === "ensureReuseLogic" || action.desc === "setDefaultWarmupSets")
        ) &&
        oldState.current !== newState.current
      ) {
        undoRedoMiddleware(dispatch, oldState);
      }
    },
    async (action, oldState, newState) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).state = newState;
    },
  ]);
  const [showClipboardInfo, setShowClipboardInfo] = useState<string | undefined>(undefined);
  const [programUrl, setProgramUrl] = useState<string | undefined>(undefined);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (props.shouldSync) {
      return;
    }
    function onBeforeUnload(e: Event): void {
      if (
        state.encodedProgramUrl != null &&
        state.initialEncodedProgramUrl != null &&
        state.encodedProgramUrl !== state.initialEncodedProgramUrl
      ) {
        e.preventDefault();
        e.returnValue = true;
      }
    }
    function onPopState(e: Event): void {
      window.location.reload();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [state]);

  useEffect(() => {
    if (props.isMobile) {
      if (window.location.href.indexOf("/p/") !== -1) {
        setProgramUrl(window.location.href);
      } else {
        const exportedProgram = ProgramContentExport.generateExportedProgram(state);
        const baseUrl = UrlUtils.build("/program", window.location.href);
        Encoder.encodeIntoUrl(JSON.stringify(exportedProgram), baseUrl.toString()).then((url) => {
          setProgramUrl(url.toString());
        });
      }
    } else if (props.exportedProgram) {
      const exportedProgram = ProgramContentExport.generateExportedProgram(state);
      const baseUrl = UrlUtils.build("/program", window.location.href);
      Encoder.encodeIntoUrl(JSON.stringify(exportedProgram), baseUrl.toString()).then((url) => {
        dispatch(lb<IProgramEditorState>().p("initialEncodedProgramUrl").record(url.toString()));
      });
    }
  }, []);

  useCopyPaste(state, dispatch);

  return (
    <div>
      <MigrationBanner program={state.current.program} settings={state.settings} client={props.client} />
      {props.isMobile ? (
        <>
          <div className="sticky top-0 left-0 z-10 w-full px-4 py-2 bg-white border-b border-grayv2-100">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="mr-4">
                  <IconLogo width={22} height={30} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">Program Preview</h3>
                  <h4 className="text-sm text-grayv2-main">{state.current.program.name}</h4>
                </div>
              </div>
              <div className="flex-1 text-right">
                <button
                  title="Settings"
                  className="p-2 nm-program-content-settings"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <IconCog2 />
                </button>
                {programUrl && (
                  <button
                    title="Copy link to clipboard"
                    className="p-2 align-middle nm-program-content-copy-to-clipboard"
                    onClick={async (e) => {
                      e.preventDefault();
                      await ClipboardUtils.copy(programUrl);
                      setShowClipboardInfo(programUrl);
                      setTimeout(() => {
                        setShowClipboardInfo(undefined);
                      }, 5000);
                    }}
                  >
                    <IconLink />
                  </button>
                )}
              </div>
            </div>
            {showClipboardInfo && (
              <div className="text-xs text-center text-grayv2-main">
                Copied to clipboard:{" "}
                <a target="_blank" className="font-bold underline text-bluev2" href={showClipboardInfo}>
                  {showClipboardInfo}
                </a>
              </div>
            )}
          </div>
          <section className="px-4">
            <div className="mt-4 text-xs text-center text-grayv2-main">
              If you want to edit this program, open this page on a laptop
            </div>
            <ProgramPreview
              isMobile={props.isMobile}
              program={state.current.program}
              settings={state.settings}
              subscription={{ google: { fake: null }, apple: {} }}
              hasNavbar={true}
            />
          </section>
        </>
      ) : (
        <ProgramContentEditor
          shouldSync={props.shouldSync}
          client={props.client}
          selected={state.ui.selected}
          state={state}
          dispatch={dispatch}
          initialEncodedProgramUrl={state.initialEncodedProgramUrl}
          encodedProgramUrl={state.encodedProgramUrl}
          onShowSettingsModal={() => setShowSettingsModal(true)}
        />
      )}
      <ProgramContentModalSettings
        isMobile={props.isMobile}
        program={state.current.program}
        isHidden={!showSettingsModal}
        settings={state.settings}
        dispatch={dispatch}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
