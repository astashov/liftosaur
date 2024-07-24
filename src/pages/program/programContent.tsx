import { h, JSX, Fragment } from "preact";
import { useLensReducer } from "../../utils/useLensReducer";
import { IProgramEditorState } from "./models/types";
import { IExportedProgram, Program } from "../../models/program";
import { Settings } from "../../models/settings";
import { undoRedoMiddleware } from "../builder/utils/undoredo";
import { UidFactory } from "../../utils/generator";
import { ProgramPreview } from "../../components/programPreview";
import { ProgramContentEditor, saveProgram } from "./programContentEditor";
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
import { IProgram, ISettings } from "../../types";
import { ImportExporter } from "../../lib/importexporter";
import { ImportFromLink } from "../../utils/importFromLink";
import { Button } from "../../components/button";

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
      {!props.shouldSync && (
        <div className="flex flex-col items-center px-8 py-4 mx-4 mb-4 bg-yellow-100 border border-orange-400 rounded-lg sm:flex-row">
          {props.account ? (
            <LoggedInGuideBanner
              onAddProgram={async () => {
                const url = state.encodedProgramUrl || state.initialEncodedProgramUrl;
                if (url) {
                  const data = await ImportFromLink.importFromLink(url, props.client);
                  if (!data.success) {
                    return;
                  }
                  const result = await ImportExporter.getExportedProgram(
                    props.client,
                    data.data.decoded,
                    state.settings
                  );
                  if (result.success) {
                    const { program, customExercises } = result.data;
                    const newProgram: IProgram = { ...program, clonedAt: Date.now() };
                    const newSettings: ISettings = {
                      ...state.settings,
                      exercises: { ...state.settings.exercises, ...customExercises },
                    };
                    alert("Starting to import!");
                    const exportedProgram = Program.exportProgram(newProgram, newSettings);
                    const id = await saveProgram(props.client, exportedProgram);
                    if (id != null) {
                      window.location.href = `${__HOST__}/user/p/${id}`;
                    }
                  } else {
                    alert(result.error.join("\n"));
                  }
                }
              }}
            />
          ) : (
            <LoggedOutGuideBanner />
          )}
        </div>
      )}
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

function LoggedInGuideBanner(props: { onAddProgram: () => void }): JSX.Element {
  return (
    <>
      <div className="flex-1">
        To use this program:
        <div>
          <Button kind="purple" name="add-program-to-account" onClick={props.onAddProgram}>
            Add this program to your account
          </Button>
        </div>
        <div className="font-bold">OR</div>
        <ul className="pl-4 list-disc">
          <li>
            Copy the link to this program by clicking on <IconLink className="inline-block" size={16} /> below
          </li>
          <li>
            Import the link in the app, on the <strong>Choose Program</strong> screen.
          </li>
        </ul>
      </div>
    </>
  );
}

function LoggedOutGuideBanner(): JSX.Element {
  return (
    <>
      <div className="flex-1">
        To use this program:
        <ul className="pl-4 list-disc">
          <li>Install Liftosaur app</li>
          <li>
            Copy the link to this program by clicking on <IconLink className="inline-block" size={16} /> below
          </li>
          <li>
            Import the link in the app, on the <strong>Choose Program</strong> screen.
          </li>
        </ul>
      </div>
      <div className="flex items-center mt-2 ml-4">
        <div>
          <a
            href="https://apps.apple.com/app/apple-store/id1661880849?pt=126680920&mt=8"
            target="_blank"
            style="display: inline-block; overflow: hidden; border-radius: 13px"
          >
            <img
              className="w-32"
              src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1673481600"
              alt="Download on the App Store"
              style="border-radius: 13px"
            />
          </a>
        </div>
        <div style={{ marginTop: "-6px" }}>
          <a
            target="_blank"
            href="https://play.google.com/store/apps/details?id=com.liftosaur.www.twa&pcampaignid=pcampaignidMKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1"
          >
            <img
              className="w-40"
              alt="Get it on Google Play"
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
            />
          </a>
        </div>
      </div>
    </>
  );
}
