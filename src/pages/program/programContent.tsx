import { h, JSX, Fragment } from "preact";
import { useLensReducer } from "../../utils/useLensReducer";
import { IProgramEditorState } from "./models/types";
import { IExportedProgram } from "../../models/program";
import { Settings } from "../../models/settings";
import { ObjectUtils } from "../../utils/object";
import { Encoder } from "../../utils/encoder";
import { undoRedoMiddleware } from "../builder/utils/undoredo";
import { getLatestMigrationVersion } from "../../migrations/migrations";
import { UidFactory } from "../../utils/generator";
import { ProgramPreview } from "../../components/programPreview";
import { ProgramContentEditor } from "./programContentEditor";
import { IconLink } from "../../components/icons/iconLink";
import { IconLogo } from "../../components/icons/iconLogo";
import { Service } from "../../api/service";
import { useState } from "preact/hooks";
import { ClipboardUtils } from "../../utils/clipboard";

export interface IProgramContentProps {
  client: Window["fetch"];
  isMobile: boolean;
  exportedProgram?: IExportedProgram;
}

export function ProgramContent(props: IProgramContentProps): JSX.Element {
  const defaultSettings = Settings.build();
  const programContentSettings = props.exportedProgram?.settings || Settings.programContentBuild();
  const initialSettings = {
    ...defaultSettings,
    ...programContentSettings,
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
    days: [{ name: "Day 1", exercises: [] }],
    exercises: [],
    tags: [],
  };
  const initialState: IProgramEditorState = {
    ui: {},
    settings: initialSettings,
    current: {
      program: initialProgram,
      editExercises: {},
    },
    history: {
      past: [],
      future: [],
    },
  };
  const [state, dispatch] = useLensReducer(initialState, { client: props.client }, [
    async (action, oldState, newState) => {
      if (oldState.current.program !== newState.current.program || oldState.settings !== newState.settings) {
        const exportedProgram: IExportedProgram = {
          program: newState.current.program,
          customExercises: newState.settings.exercises,
          version: getLatestMigrationVersion(),
          settings: ObjectUtils.pick(newState.settings, ["timers", "units"]),
        };
        await Encoder.encodeIntoUrlAndSetUrl(JSON.stringify(exportedProgram));
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
  ]);
  const [showClipboardInfo, setShowClipboardInfo] = useState<string | undefined>(undefined);

  return (
    <div>
      <div className="flex flex-col items-center px-8 py-4 mx-4 mb-4 bg-yellow-100 border border-orange-400 rounded-lg sm:flex-row">
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
              href="https://apps.apple.com/us/app/liftosaur/id1661880849?itsct=apps_box_badge&amp;itscg=30200"
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
      </div>
      {props.isMobile ? (
        <>
          <div className="sticky top-0 left-0 w-full px-4 py-2 bg-white border-b border-grayv2-100">
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
                  title="Copy link to clipboard"
                  className="p-2 align-middle"
                  onClick={async () => {
                    const service = new Service(props.client);
                    const url = await service.postShortUrl(window.location.href, "p");
                    await ClipboardUtils.copy(url);
                    setShowClipboardInfo(url);
                    setTimeout(() => {
                      setShowClipboardInfo(undefined);
                    }, 5000);
                  }}
                >
                  <IconLink />
                </button>
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
              program={state.current.program}
              settings={state.settings}
              subscription={{ google: { fake: null }, apple: {} }}
            />
          </section>
        </>
      ) : (
        <ProgramContentEditor client={props.client} state={state} dispatch={dispatch} />
      )}
    </div>
  );
}
