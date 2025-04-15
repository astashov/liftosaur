import { h, JSX, Fragment } from "preact";
import { useLensReducer } from "../../utils/useLensReducer";
import { IPlannerState } from "./models/types";
import { BuilderLinkInlineInput } from "../builder/components/builderInlineInput";
import { lb, lf } from "lens-shmens";
import { HtmlUtils } from "../../utils/html";
import { Encoder } from "../../utils/encoder";
import { useEffect, useState } from "preact/hooks";
import { IconCog2 } from "../../components/icons/iconCog2";
import { ModalPlannerSettings } from "./components/modalPlannerSettings";
import { ModalExercise } from "../../components/modalExercise";
import { Settings } from "../../models/settings";
import { StringUtils } from "../../utils/string";
import { Exercise } from "../../models/exercise";
import { undoRedoMiddleware, useUndoRedo } from "../builder/utils/undoredo";
import { BuilderCopyLink } from "../builder/components/builderCopyLink";
import {
  ICustomExercise,
  IExerciseKind,
  IMuscle,
  IPartialStorage,
  IPlannerProgram,
  IPlannerProgramDay,
  IPlannerProgramWeek,
  ISettings,
} from "../../types";
import { Service } from "../../api/service";
import { PlannerProgram } from "./models/plannerProgram";
import { IconCloseCircleOutline } from "../../components/icons/iconCloseCircleOutline";
import { PlannerCodeBlock } from "./components/plannerCodeBlock";
import { IconHelp } from "../../components/icons/iconHelp";
import { IconDoc } from "../../components/icons/iconDoc";
import { PlannerContentPerDay } from "./plannerContentPerDay";
import { PlannerContentFull } from "./plannerContentFull";
import { Modal } from "../../components/modal";
import { GroupHeader } from "../../components/groupHeader";
import { ProgramPreviewOrPlayground } from "../../components/programPreviewOrPlayground";
import { UidFactory } from "../../utils/generator";
import { IconPreview } from "../../components/icons/iconPreview";
import { IAccount } from "../../models/account";
import { PlannerBanner } from "./plannerBanner";
import { UrlUtils } from "../../utils/url";
import { ProgramQrCode } from "../../components/programQrCode";
import { Button } from "../../components/button";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { IExportedProgram, Program } from "../../models/program";
import { LinkButton } from "../../components/linkButton";
import { ModalPlannerProgramRevisions } from "./modalPlannerProgramRevisions";
import { Weight } from "../../models/weight";
import { IconPicture } from "../../components/icons/iconPicture";
import { ModalPlannerPictureExport } from "./components/modalPlannerPictureExport";

declare let __HOST__: string;

export interface IPlannerContentProps {
  client: Window["fetch"];
  nextDay?: number;
  initialProgram?: IExportedProgram;
  partialStorage?: IPartialStorage;
  account?: IAccount;
  shouldSync?: boolean;
  revisions: string[];
}

async function saveProgram(client: Window["fetch"], exportProgram: IExportedProgram): Promise<string | undefined> {
  const service = new Service(client);
  const result = await service.postSaveProgram(exportProgram);
  if (result.success) {
    return result.data;
  } else {
    alert("Failed to save the program");
    return undefined;
  }
}

function isChanged(state: IPlannerState): boolean {
  return (
    state.encodedProgram != null &&
    state.initialEncodedProgram != null &&
    state.encodedProgram !== state.initialEncodedProgram
  );
}

function getCurrentUrl(): string | undefined {
  if (typeof window !== "undefined") {
    const url = UrlUtils.build(window.location.href);
    if (/p\/[a-z0-9]+/.test(url.pathname)) {
      url.search = "";
      url.hash = "";
      return url.toString();
    }
  }
  return undefined;
}

export function PlannerContent(props: IPlannerContentProps): JSX.Element {
  const service = new Service(props.client);
  const initialDay: IPlannerProgramDay = {
    name: "Day 1",
    exerciseText: "",
  };

  const initialWeek: IPlannerProgramWeek = {
    name: "Week 1",
    days: [initialDay],
  };

  const initialPlanner: IPlannerProgram = props.initialProgram?.program?.planner || {
    name: "My Program",
    weeks: [initialWeek],
  };

  const initialProgram = props.initialProgram?.program || {
    ...Program.create("My Program"),
    planner: initialPlanner,
  };

  const initialSettings: ISettings = Settings.build();
  initialSettings.exercises = {
    ...initialSettings.exercises,
    ...props.partialStorage?.settings?.exercises,
    ...props.initialProgram?.customExercises,
  };
  initialSettings.timers.workout =
    props.initialProgram?.settings?.timers?.workout ??
    props.partialStorage?.settings?.timers.workout ??
    initialSettings.timers.workout;
  initialSettings.planner = props.initialProgram?.settings?.planner || initialSettings.planner;
  initialSettings.units = props.partialStorage?.settings?.units ?? initialSettings.units;
  initialSettings.exerciseData = props.partialStorage?.settings?.exerciseData ?? initialSettings.exerciseData;

  const [settings, setSettings] = useState(initialSettings);
  const [isBannerLoading, setIsBannerLoading] = useState(false);

  const initialState: IPlannerState = {
    id: initialProgram.id || UidFactory.generateUid(8),
    current: {
      program: initialProgram,
    },
    initialEncodedProgram: undefined,
    encodedProgram: undefined,
    ui: { weekIndex: 0, exerciseUi: { edit: new Set(), collapsed: new Set() } },
    history: {
      past: [],
      future: [],
    },
  };

  const [state, dispatch] = useLensReducer(initialState, { client: props.client }, [
    async (action, oldState, newState) => {
      if (oldState.current.program !== newState.current.program) {
        const exportProgram = Program.exportProgram(newState.current.program, settings);
        dispatch(lb<IPlannerState>().p("encodedProgram").record(JSON.stringify(exportProgram)));
      }
    },
    async (action, oldState, newState) => {
      if (
        !("type" in action && action.type === "Update" && action.desc === "undo") &&
        oldState.current.program !== newState.current.program
      ) {
        undoRedoMiddleware(dispatch, oldState);
      }
    },
    async (action, oldState, newState) => {
      if ("type" in action && action.type === "Update" && action.desc === "stop-is-undoing") {
        setTimeout(() => {
          window.isUndoing = false;
        }, 200);
      }
    },
    async (action, oldState, newState) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).state = newState;
    },
  ]);
  const planner = state.current.program.planner!;
  useUndoRedo(state, dispatch, [!!state.fulltext], () => state.fulltext == null);
  useEffect(() => {
    setShowHelp(typeof window !== "undefined" && window.localStorage.getItem("hide-planner-help") !== "true");
    if (props.initialProgram) {
      const exportProgram = Program.exportProgram(state.current.program, settings);
      Encoder.encodeIntoUrl(JSON.stringify(exportProgram), window.location.href).then(() => {
        dispatch(lb<IPlannerState>().p("initialEncodedProgram").record(JSON.stringify(exportProgram)));
      });
    }
  }, []);
  useEffect(() => {
    function onBeforeUnload(e: Event): void {
      if (isChanged(state)) {
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

  const [showClipboardInfo, setShowClipboardInfo] = useState<string | undefined>(undefined);
  const [showHelp, setShowHelp] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clearHasChanges, setClearHasChanges] = useState<boolean>(false);

  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const program = state.current.program;

  const modalExerciseUi = state.ui.modalExercise;
  const isInvalid = !PlannerProgram.isValid(planner, settings);

  const script = "Squat / 3x3-5\nRomanian Deadlift / 3x8";
  const maxWidth = "1200px";

  return (
    <section className="px-4">
      {!props.shouldSync && isChanged(state) && !clearHasChanges && (
        <div className="fixed top-0 left-0 z-50 w-full text-xs text-center border-b bg-redv2-200 border-redv2-500 text-redv2-main">
          Made changes to the program, but the link still goes to the original version. If you want to share updated
          version, generate a new link.
          <button className="p-2 align-middle nm-clear-has-changes" onClick={() => setClearHasChanges(true)}>
            <IconCloseCircleOutline size={14} />
          </button>
        </div>
      )}
      <div className="flex mx-auto" style={{ maxWidth }}>
        <h1 className="flex items-center mb-4 mr-auto text-2xl font-bold leading-tightm">
          <div>Web Editor</div>
          {!showHelp && (
            <button
              className="block ml-3 nm-planner-help"
              onClick={() => {
                setShowHelp(true);
                window.localStorage.removeItem("hide-planner-help");
              }}
            >
              <IconHelp />
            </button>
          )}
        </h1>
        {props.shouldSync && props.revisions && props.revisions.length > 0 && (
          <div>
            <LinkButton name="show-revisions" onClick={() => setShowRevisions(true)}>
              Versions
            </LinkButton>
          </div>
        )}
      </div>

      <div className="mx-auto" style={{ maxWidth }}>
        <div
          style={{ display: showHelp ? "block" : "none" }}
          className="relative px-8 py-4 mb-4 mr-0 bg-yellow-100 border border-orange-400 rounded-lg sm:mr-64"
        >
          <div>
            <p className="mb-2">
              This tool allows you to quickly build your weightlifting programs, ensure you have proper{" "}
              <strong>weekly volume per muscle group</strong>, and balance it with the{" "}
              <strong>time you spend in a gym</strong>. You can build multi-week programs, plan your mesocycles, deload
              weeks, testing 1RM weeks, and see the weekly undulation of volume and intensity of each exercise on a
              graph.
            </p>
            <p className="mb-2">
              Set the program name, create weeks and days, type the list of exercises for each day, putting each
              exercise on a new line, along with the number of sets and reps after slash (
              <pre className="inline">/</pre>) character, like this:
            </p>
            <div>
              <div className="inline-block px-4 py-2 my-1 mb-2 bg-white border rounded-md border-grayv2-300">
                <PlannerCodeBlock script={script} />
              </div>
            </div>
            <p className="mb-2">
              Autocomplete will help you with the exercise names. You can also create custom exercises if they're
              missing in the library.
            </p>
            <p className="mb-2">
              On the right you'll see <strong>Weekly Stats</strong>, where you can see the number of sets per week per
              muscle group, whether you're in the recommended range (indicated by color), strength/hypertrophy split,
              and if you hover a mouse over the numbers - you'll see what exercises contribute to that number, and how
              much.
            </p>
            <p className="mb-2">
              The exercise syntax supports{" "}
              <abbr title="RPE - Rate of Perceived Exertion. It's a subjective measure of how hard the set was.">
                RPEs
              </abbr>{" "}
              , percentage of{" "}
              <abbr title="1RM - One Rep Max. The maximum weight you can lift for one repetition.">1RM</abbr>, rest
              timers, various progressive overload types, etc. Read more about the features{" "}
              <a target="_blank" className="font-bold underline text-bluev2" href="https://www.liftosaur.com/docs/">
                in the docs
              </a>
              !
            </p>
            <p className="mb-2">
              When you're done, you can convert this program to Liftosaur program, and run what you planned in the gym,
              using the <strong>Liftosaur app</strong>!
            </p>
          </div>
          <button
            className="absolute nm-planner-help-close"
            style={{ top: "0.5rem", right: "0.5rem" }}
            onClick={() => {
              setShowHelp(false);
              window.localStorage.setItem("hide-planner-help", "true");
            }}
          >
            <IconCloseCircleOutline />
          </button>
        </div>
      </div>

      {!props.shouldSync && (
        <div className="mx-auto" style={{ maxWidth }}>
          <PlannerBanner
            isBannerLoading={isBannerLoading}
            account={props.account}
            onAddProgram={async () => {
              const exportProgram = Program.exportProgram(state.current.program, settings);
              const pg = exportProgram.program;
              if (pg.planner && PlannerProgram.hasNonSelectedWeightUnit(pg.planner, settings)) {
                const fromUnit = Weight.oppositeUnit(settings.units);
                const toUnit = settings.units;
                if (confirm(`The program has weights in ${fromUnit}, do you want to convert them to ${toUnit}?`)) {
                  pg.planner = PlannerProgram.switchToUnit(pg.planner, settings);
                }
              }
              setIsBannerLoading(true);
              const id = await saveProgram(props.client, exportProgram);
              if (id != null) {
                window.location.href = `${__HOST__}/user/p/${id}`;
              }
            }}
          />
        </div>
      )}

      <div className="flex flex-col mb-2 sm:flex-row">
        <div className="flex-1 py-2 ">
          <h2 className="mr-2 text-2xl font-bold">
            <BuilderLinkInlineInput
              value={state.current.program.name}
              onInputString={(v) => {
                dispatch(lbProgram.p("name").record(v));
                dispatch(lb<IPlannerState>().p("current").p("program").p("name").record(v));
                document.title = `Liftosaur: Weight Lifting Tracking App | ${HtmlUtils.escapeHtml(v)}`;
              }}
            />
          </h2>
          {props.shouldSync ? (
            <span
              className="text-xs font-normal text-grayv2-main nm-program-content-change-id"
              style={{ marginTop: "-0.5rem" }}
            >
              id: {state.id}
            </span>
          ) : (
            <button
              className="text-xs font-normal text-grayv2-main nm-program-content-change-id"
              style={{ marginTop: "-0.5rem" }}
              onClick={() => {
                const id = UidFactory.generateUid(8);
                dispatch([
                  lb<IPlannerState>().p("id").record(id),
                  lb<IPlannerState>().p("current").p("program").p("id").record(id),
                ]);
              }}
            >
              id: {state.id}
            </button>
          )}
        </div>
        <div className="flex items-center">
          {props.shouldSync && (
            <div className="mr-2">
              <Button
                className="w-20"
                buttonSize="md"
                kind="orange"
                name="web-save-planner"
                disabled={isLoading || isInvalid || !isChanged(state)}
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const exportProgram = Program.exportProgram(state.current.program, settings);
                    await saveProgram(props.client, exportProgram);
                    dispatch(lb<IPlannerState>().p("initialEncodedProgram").record(state.encodedProgram));
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? <IconSpinner color="white" width={18} height={18} /> : "Save"}
              </Button>
            </div>
          )}
          <div className={state.fulltext != null ? "hidden sm:block" : ""}>
            <button
              disabled={isInvalid}
              className="p-2"
              onClick={() => {
                if (!isInvalid) {
                  dispatch(lb<IPlannerState>().p("ui").p("showPictureExport").record(true));
                }
              }}
            >
              <IconPicture size={24} />
            </button>
          </div>
          <div className={state.fulltext != null ? "hidden sm:block" : ""}>
            <button
              disabled={isInvalid}
              className="p-2"
              onClick={() => {
                if (!isInvalid) {
                  dispatch(lb<IPlannerState>().p("ui").p("showPreview").record(true));
                }
              }}
            >
              <IconPreview size={22} />
            </button>
          </div>
          {state.fulltext == null && (
            <>
              <div>
                <button
                  disabled={isInvalid}
                  title={
                    isInvalid ? "Fix errors in all weeks/days to switch to Full Program mode" : "Edit Full Program"
                  }
                  onClick={() =>
                    dispatch(
                      lb<IPlannerState>()
                        .p("fulltext")
                        .record({ text: PlannerProgram.generateFullText(planner.weeks) })
                    )
                  }
                  className={`p-2 nm-edit-full-program ${isInvalid ? "cursor-not-allowed" : ""}`}
                >
                  <IconDoc color={isInvalid ? "#BAC4CD" : "#3C5063"} />
                </button>
              </div>
              <BuilderCopyLink
                suppressShowInfo={true}
                onShowInfo={setShowClipboardInfo}
                type="p"
                program={program}
                client={props.client}
                encodedProgram={async () => {
                  const exportProgram = Program.exportProgram(program, settings);
                  const baseUrl = UrlUtils.build("/planner", window.location.href);
                  const encodedUrl = await Encoder.encodeIntoUrl(JSON.stringify(exportProgram), baseUrl.toString());
                  return encodedUrl.toString();
                }}
              />
              <div>
                <button
                  title="Settings"
                  onClick={() => dispatch(lb<IPlannerState>().p("ui").p("showSettingsModal").record(true))}
                  className="p-2 nm-planner-settings"
                >
                  <IconCog2 />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showClipboardInfo && (
        <>
          <div className="mb-2 text-xs text-left sm:text-right text-grayv2-main">
            Copied to clipboard:{" "}
            <a target="_blank" className="font-bold underline text-bluev2" href={showClipboardInfo}>
              {showClipboardInfo}
            </a>
          </div>
          <div className="text-right">
            <ProgramQrCode url={showClipboardInfo} title="Scan this QR to open that link:" />
          </div>
        </>
      )}

      <div>
        {state.fulltext != null ? (
          <PlannerContentFull
            fullText={state.fulltext}
            settings={settings}
            dispatch={dispatch}
            service={service}
            lbProgram={lbProgram}
          />
        ) : (
          <PlannerContentPerDay
            program={planner}
            settings={settings}
            ui={state.ui}
            service={service}
            initialWeek={initialWeek}
            initialDay={initialDay}
            dispatch={dispatch}
          />
        )}
      </div>
      {state.ui.showSettingsModal && (
        <ModalPlannerSettings
          inApp={false}
          onNewSettings={(newSettings) => setSettings(newSettings)}
          settings={settings}
          onClose={() => dispatch(lb<IPlannerState>().p("ui").p("showSettingsModal").record(false))}
        />
      )}
      {state.ui.showPreview && (
        <Modal
          isFullWidth={true}
          name="program-preview"
          shouldShowClose={true}
          onClose={() => dispatch(lb<IPlannerState>().pi("ui").p("showPreview").record(false))}
        >
          <GroupHeader size="large" name="Program Preview" />
          <ProgramPreviewOrPlayground
            key={settings.units}
            program={program}
            isMobile={false}
            hasNavbar={false}
            settings={settings}
            onChangeUnit={(unit) => {
              setSettings(lf(settings).p("units").set(unit));
            }}
          />
        </Modal>
      )}
      {modalExerciseUi && (
        <ModalExercise
          isHidden={!modalExerciseUi}
          shouldAddExternalLinks={true}
          onChange={(exerciseType, shouldClose) => {
            window.isUndoing = true;
            if (shouldClose) {
              dispatch([
                lb<IPlannerState>().p("ui").p("modalExercise").record(undefined),
                lb<IPlannerState>().p("ui").p("focusedExercise").record(undefined),
              ]);
            }
            if (modalExerciseUi.exerciseType && modalExerciseUi.exerciseKey) {
              if (!exerciseType) {
                return;
              }
              if (state.fulltext) {
                const newPlanner = {
                  name: state.current.program.name,
                  weeks: PlannerProgram.evaluateText(state.fulltext.text),
                };
                const newProgram = { ...program, planner: newPlanner };
                const newProgramResult = PlannerProgram.replaceExercise(
                  newProgram,
                  modalExerciseUi.exerciseKey,
                  exerciseType,
                  settings
                );
                if (newProgramResult.success && newProgramResult.data.planner) {
                  const newText = PlannerProgram.generateFullText(newProgramResult.data.planner.weeks);
                  dispatch([lb<IPlannerState>().pi("fulltext").p("text").record(newText)]);
                } else if (!newProgramResult.success) {
                  alert(newProgramResult.error);
                }
              } else {
                const newProgramResult = PlannerProgram.replaceExercise(
                  program,
                  modalExerciseUi.exerciseKey,
                  exerciseType,
                  settings
                );
                if (newProgramResult.success && newProgramResult.data.planner) {
                  dispatch([
                    lb<IPlannerState>().p("current").p("program").pi("planner").record(newProgramResult.data.planner),
                  ]);
                } else if (!newProgramResult.success) {
                  alert(newProgramResult.error);
                }
              }
            } else {
              dispatch([
                state.fulltext
                  ? lb<IPlannerState>()
                      .pi("fulltext")
                      .p("text")
                      .recordModify((text) => {
                        if (!exerciseType) {
                          return text;
                        }
                        const line = state.fulltext?.currentLine;
                        if (line == null) {
                          return text;
                        }
                        const exercise = Exercise.getById(exerciseType.id, settings.exercises);
                        const lines = text.split("\n");
                        lines.splice(line, 0, exercise.name);
                        return lines.join("\n");
                      })
                  : lbProgram
                      .p("weeks")
                      .i(modalExerciseUi.focusedExercise.weekIndex)
                      .p("days")
                      .i(modalExerciseUi.focusedExercise.dayIndex)
                      .p("exerciseText")
                      .recordModify((exerciseText) => {
                        if (!exerciseType) {
                          return exerciseText;
                        }
                        const exercise = Exercise.getById(exerciseType.id, settings.exercises);
                        return exerciseText + `\n${exercise.name}`;
                      }),
              ]);
            }
            dispatch(
              [
                lb<IPlannerState>()
                  .p("ui")
                  .recordModify((ui) => ui),
              ],
              "stop-is-undoing"
            );
          }}
          onCreateOrUpdate={(
            shouldClose: boolean,
            name: string,
            targetMuscles: IMuscle[],
            synergistMuscles: IMuscle[],
            types: IExerciseKind[],
            smallImageUrl?: string,
            largeImageUrl?: string,
            exercise?: ICustomExercise
          ) => {
            const exercises = Exercise.createOrUpdateCustomExercise(
              settings.exercises,
              name,
              targetMuscles,
              synergistMuscles,
              types,
              smallImageUrl,
              largeImageUrl,
              exercise
            );
            setSettings(lf(settings).p("exercises").set(exercises));
            if (exercise) {
              const newProgram = Program.changeExerciseName(exercise.name, name, state.current.program, {
                ...settings,
                exercises,
              });
              window.isUndoing = true;
              dispatch(lbProgram.record(newProgram.planner!));
              dispatch(lbProgram.record(newProgram.planner!), "stop-is-undoing");
            }
            if (shouldClose) {
              dispatch(lb<IPlannerState>().p("ui").p("modalExercise").record(undefined));
            }
          }}
          onDelete={(id) => {
            setSettings(
              lf(settings)
                .p("exercises")
                .set({ ...settings.exercises, [id]: { ...settings.exercises[id]!, isDeleted: true } })
            );
          }}
          settings={{ ...Settings.build(), exercises: settings.exercises }}
          customExerciseName={modalExerciseUi.customExerciseName}
          exerciseType={modalExerciseUi.exerciseType}
          initialFilterTypes={[...modalExerciseUi.muscleGroups, ...modalExerciseUi.types].map(StringUtils.capitalize)}
        />
      )}
      {state.ui.showPictureExport && (
        <ModalPlannerPictureExport
          isChanged={isChanged(state)}
          client={props.client}
          url={showClipboardInfo ?? getCurrentUrl()}
          settings={settings}
          program={program}
          onClose={() => dispatch(lb<IPlannerState>().p("ui").p("showPictureExport").record(false))}
        />
      )}
      {showRevisions && props.revisions.length > 0 && (
        <ModalPlannerProgramRevisions
          programId={state.id}
          client={props.client}
          revisions={props.revisions}
          onClose={() => setShowRevisions(false)}
          onRestore={(text) => {
            window.isUndoing = true;
            dispatch([lbProgram.p("weeks").record(PlannerProgram.evaluateText(text))]);
            setShowRevisions(false);
            dispatch([lb<IPlannerState>().p("fulltext").record(undefined)], "stop-is-undoing");
          }}
        />
      )}
    </section>
  );
}
