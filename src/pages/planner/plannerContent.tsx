import { h, JSX, Fragment } from "preact";
import { useLensReducer } from "../../utils/useLensReducer";
import { IPlannerState, IExportedPlannerProgram } from "./models/types";
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
import { PlannerToProgram } from "../../models/plannerToProgram";
import { UidFactory } from "../../utils/generator";
import { IconPreview } from "../../components/icons/iconPreview";
import { IAccount } from "../../models/account";
import { PlannerBanner } from "./plannerBanner";
import { UrlUtils } from "../../utils/url";
import { getLatestMigrationVersion } from "../../migrations/migrations";
import { ProgramQrCode } from "../../components/programQrCode";
import { Button } from "../../components/button";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { IExportedProgram, Program } from "../../models/program";
import { LinkButton } from "../../components/linkButton";
import { ModalPlannerProgramRevisions } from "./modalPlannerProgramRevisions";

declare let __HOST__: string;

export interface IPlannerContentProps {
  client: Window["fetch"];
  nextDay?: number;
  initialProgram?: IExportedPlannerProgram;
  partialStorage?: IPartialStorage;
  account?: IAccount;
  shouldSync?: boolean;
  revisions: string[];
}

async function saveProgram(client: Window["fetch"], exportedProgram: IExportedProgram): Promise<string | undefined> {
  const service = new Service(client);
  const result = await service.postSaveProgram(exportedProgram);
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

function buildExportedProgram(
  id: string,
  program: IPlannerProgram,
  settings: ISettings,
  nextDay?: number
): IExportedProgram {
  const { evaluatedWeeks } = PlannerProgram.evaluate(program, settings);

  const exportedPlannerProgram: IExportedPlannerProgram = {
    id,
    type: "v2",
    version: getLatestMigrationVersion(),
    program: program,
    plannerSettings: settings.planner,
    settings: {
      exercises: PlannerProgram.usedExercises(settings.exercises, evaluatedWeeks),
      timer: settings.timers.workout ?? 0,
    },
  };
  return Program.exportedPlannerProgramToExportedProgram(exportedPlannerProgram, nextDay);
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

  const initialProgram: IPlannerProgram = props.initialProgram?.program || {
    name: "My Program",
    weeks: [initialWeek],
  };

  const initialSettings: ISettings = Settings.build();
  initialSettings.exercises = {
    ...initialSettings.exercises,
    ...props.partialStorage?.settings?.exercises,
    ...props.initialProgram?.settings?.exercises,
  };
  initialSettings.timers.workout =
    props.initialProgram?.settings?.timer ??
    props.partialStorage?.settings?.timers.workout ??
    initialSettings.timers.workout;
  initialSettings.planner = props.initialProgram?.plannerSettings || initialSettings.planner;
  initialSettings.units = props.partialStorage?.settings?.units ?? initialSettings.units;
  initialSettings.exerciseData = props.partialStorage?.settings?.exerciseData ?? initialSettings.exerciseData;

  const [settings, setSettings] = useState(initialSettings);
  const [isBannerLoading, setIsBannerLoading] = useState(false);

  const initialState: IPlannerState = {
    id: props.initialProgram?.id || UidFactory.generateUid(8),
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
        const exportedProgram = buildExportedProgram(newState.id, newState.current.program, settings, props.nextDay);
        dispatch(lb<IPlannerState>().p("encodedProgram").record(JSON.stringify(exportedProgram)));
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
  useUndoRedo(state, dispatch, [!!state.fulltext], () => state.fulltext == null);
  useEffect(() => {
    setShowHelp(typeof window !== "undefined" && window.localStorage.getItem("hide-planner-help") !== "true");
    if (props.initialProgram) {
      const exportedProgram = buildExportedProgram(state.id, state.current.program, settings, props.nextDay);
      Encoder.encodeIntoUrl(JSON.stringify(exportedProgram), window.location.href).then(() => {
        dispatch(lb<IPlannerState>().p("initialEncodedProgram").record(JSON.stringify(exportedProgram)));
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

  const lbProgram = lb<IPlannerState>().p("current").p("program");
  const program = state.current.program;

  const modalExerciseUi = state.ui.modalExercise;
  const isInvalid = !PlannerProgram.isValid(state.current.program, settings);

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
              const exportedProgram = buildExportedProgram(state.id, state.current.program, settings, props.nextDay);
              setIsBannerLoading(true);
              const id = await saveProgram(props.client, exportedProgram);
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
              onClick={() => dispatch(lb<IPlannerState>().p("id").record(UidFactory.generateUid(8)))}
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
                    const exportedProgram = buildExportedProgram(
                      state.id,
                      state.current.program,
                      settings,
                      props.nextDay
                    );
                    await saveProgram(props.client, exportedProgram);
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
                        .record({ text: PlannerProgram.generateFullText(program.weeks) })
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
                  const exportedProgram = buildExportedProgram(state.id, program, settings, props.nextDay);
                  const baseUrl = UrlUtils.build("/planner", window.location.href);
                  const encodedUrl = await Encoder.encodeIntoUrl(JSON.stringify(exportedProgram), baseUrl.toString());
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
            <ProgramQrCode url={showClipboardInfo} />
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
            program={program}
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
            program={new PlannerToProgram(
              UidFactory.generateUid(8),
              1,
              state.current.program,
              settings
            ).convertToProgram()}
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
                const newProgram = {
                  name: state.current.program.name,
                  weeks: PlannerProgram.evaluateText(state.fulltext.text),
                };
                const newPlannerProgram = PlannerProgram.replaceExercise(
                  newProgram,
                  modalExerciseUi.exerciseKey,
                  exerciseType,
                  settings
                );
                const newText = PlannerProgram.generateFullText(newPlannerProgram.weeks);
                dispatch([lb<IPlannerState>().pi("fulltext").p("text").record(newText)]);
              } else {
                const newPlannerProgram = PlannerProgram.replaceExercise(
                  state.current.program,
                  modalExerciseUi.exerciseKey,
                  exerciseType,
                  settings
                );
                dispatch([lb<IPlannerState>().p("current").p("program").record(newPlannerProgram)]);
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
      {showRevisions && props.revisions.length > 0 && (
        <ModalPlannerProgramRevisions
          programId={state.id}
          client={props.client}
          revisions={props.revisions}
          onClose={() => setShowRevisions(false)}
          onRestore={(text) => {
            window.isUndoing = true;
            dispatch([
              lb<IPlannerState>().p("current").p("program").p("weeks").record(PlannerProgram.evaluateText(text)),
            ]);
            setShowRevisions(false);
            dispatch([lb<IPlannerState>().p("fulltext").record(undefined)], "stop-is-undoing");
          }}
        />
      )}
    </section>
  );
}
