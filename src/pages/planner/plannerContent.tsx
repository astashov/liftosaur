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
  IEquipment,
  IExerciseKind,
  IMuscle,
  IPartialStorage,
  IPlannerProgram,
  IPlannerProgramDay,
  IPlannerProgramWeek,
  ISettings,
} from "../../types";
import { Service } from "../../api/service";
import { Button } from "../../components/button";
import { IExportedProgram } from "../../models/program";
import { getLatestMigrationVersion } from "../../migrations/migrations";
import { ClipboardUtils } from "../../utils/clipboard";
import { PlannerToProgram } from "../../models/plannerToProgram";
import { PlannerProgram } from "./models/plannerProgram";
import { IconCloseCircleOutline } from "../../components/icons/iconCloseCircleOutline";
import { PlannerCodeBlock } from "./components/plannerCodeBlock";
import { IconHelp } from "../../components/icons/iconHelp";
import { UrlUtils } from "../../utils/url";
import { IconDoc } from "../../components/icons/iconDoc";
import { PlannerContentPerDay } from "./plannerContentPerDay";
import { ObjectUtils } from "../../utils/object";
import { PlannerContentFull } from "./plannerContentFull";
import { Equipment } from "../../models/equipment";
import { useRef } from "preact/compat";

declare let __HOST__: string;

export interface IPlannerContentProps {
  client: Window["fetch"];
  initialProgram?: IExportedPlannerProgram;
  partialStorage?: IPartialStorage;
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
  initialSettings.exercises = { ...initialSettings.exercises, ...props.partialStorage?.settings.exercises };
  initialSettings.equipment = { ...initialSettings.equipment, ...props.partialStorage?.settings.equipment };
  const prevSettings = useRef(initialSettings);
  const [settings, setSettings] = useState(initialSettings);

  const initialState: IPlannerState = {
    current: {
      program: initialProgram,
    },
    ui: { weekIndex: 0 },
    history: {
      past: [],
      future: [],
    },
  };
  const [state, dispatch] = useLensReducer(initialState, { client: props.client }, [
    async (action, oldState, newState) => {
      if (oldState.current.program !== newState.current.program) {
        const exportedProgram: IExportedPlannerProgram = {
          program: newState.current.program,
          settings: settings.planner,
        };
        await Encoder.encodeIntoUrlAndSetUrl(JSON.stringify(exportedProgram));
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
  }, []);
  useEffect(() => {
    if (prevSettings.current !== settings) {
      const exportedProgram: IExportedPlannerProgram = {
        program: state.current.program,
        settings: settings.planner,
      };
      Encoder.encodeIntoUrlAndSetUrl(JSON.stringify(exportedProgram));
    }
    prevSettings.current = settings;
  }, [settings, state.current.program]);
  const [showClipboardInfo, setShowClipboardInfo] = useState<string | undefined>(undefined);
  const [showLiftosaurConvertInfo, setShowLiftosaurConvertInfo] = useState<string | undefined>(undefined);
  const [showHelp, setShowHelp] = useState(false);

  const lbProgram = lb<IPlannerState>().p("current").p("program");
  const program = state.current.program;

  const modalExerciseUi = state.ui.modalExercise;
  const isInvalid = !PlannerProgram.isValid(state.current.program, settings);

  const script = "Squat / 3x3-5\nRomanian Deadlift / 3x8";

  return (
    <section className="px-4">
      <h1 className="flex items-center mb-4 text-2xl font-bold leading-tight">
        <div>Workout Planner</div>
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

      <div
        style={{ display: showHelp ? "block" : "none" }}
        className="relative px-8 py-4 mb-4 mr-0 bg-yellow-100 border border-orange-400 rounded-lg sm:mr-64"
      >
        <div>
          <p className="mb-2">
            This tool allows you to quickly build your weightlifting programs, ensure you have proper{" "}
            <strong>weekly volume per muscle group</strong>, and balance it with the{" "}
            <strong>time you spend in a gym</strong>. You can build multi-week programs, plan your mesocycles, deload
            weeks, testing 1RM weeks, and see the weekly undulation of volume and intensity of each exercise on a graph.
          </p>
          <p className="mb-2">
            Set the program name, create weeks and days, type the list of exercises for each day, putting each exercise
            on a new line, along with the number of sets and reps after slash (<pre className="inline">/</pre>)
            character, like this:
          </p>
          <div>
            <div className="inline-block px-4 py-2 my-1 mb-2 font-bold bg-white border rounded-md border-grayv2-300">
              <PlannerCodeBlock script={script} />
            </div>
          </div>
          <p className="mb-2">
            Autocomplete will help you with the exercise names. You can also create custom exercises if they're missing
            in the library.
          </p>
          <p className="mb-2">
            On the right you'll see <strong>Weekly Stats</strong>, where you can see the number of sets per week per
            muscle group, whether you're in the recommended range (indicated by color), strength/hypertrophy split, and
            if you hover a mouse over the numbers - you'll see what exercises contribute to that number, and how much.
          </p>
          <p className="mb-2">
            The exercise syntax supports{" "}
            <abbr title="RPE - Rate of Perceived Exertion. It's a subjective measure of how hard the set was.">
              RPEs
            </abbr>{" "}
            , percentage of{" "}
            <abbr title="1RM - One Rep Max. The maximum weight you can lift for one repetition.">1RM</abbr>, rest
            timers, various progressive overload types, etc. Read more about features{" "}
            <a
              target="_blank"
              className="font-bold underline text-bluev2"
              href="https://www.liftosaur.com/blog/posts/launched-workout-planner/"
            >
              in this blog post
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

      <div className="flex flex-col mb-2 sm:flex-row">
        <h2 className="flex-1 pb-4 mr-2 text-2xl font-bold">
          <BuilderLinkInlineInput
            value={state.current.program.name}
            onInputString={(v) => {
              dispatch(lbProgram.p("name").record(v));
              document.title = `Liftosaur: Weight Lifting Tracking App | ${HtmlUtils.escapeHtml(v)}`;
            }}
          />
        </h2>
        <div className="flex items-center">
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
                type="n"
                program={program}
                client={props.client}
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
              <div className="ml-2">
                <Button
                  name="planner-convert-to-liftosaur"
                  kind="purple"
                  disabled={isInvalid}
                  title={isInvalid ? "Fix the errors in the program before converting" : undefined}
                  onClick={async () => {
                    const liftosaurProgram = new PlannerToProgram(state.current.program, settings).convert();
                    const usedCustomExercises = ObjectUtils.keys(settings.exercises).reduce<typeof settings.exercises>(
                      (memo, id) => {
                        const exercise = settings.exercises[id];
                        if (exercise && liftosaurProgram.exercises.some((e) => e.exerciseType.id === exercise.id)) {
                          memo[id] = exercise;
                        }
                        return memo;
                      },
                      {}
                    );
                    const usedCustomEquipment = ObjectUtils.keys(settings.equipment).reduce<typeof settings.equipment>(
                      (memo, id) => {
                        if (
                          !Equipment.isBuiltIn(id) &&
                          liftosaurProgram.exercises.some((e) => e.exerciseType.equipment === id)
                        ) {
                          memo[id] = settings.equipment[id];
                        }
                        return memo;
                      },
                      {}
                    );
                    const exportedProgram: IExportedProgram = {
                      program: liftosaurProgram,
                      customExercises: usedCustomExercises,
                      customEquipment: usedCustomEquipment,
                      version: getLatestMigrationVersion(),
                      settings: {
                        timers: {
                          workout: settings.timers.workout ?? 180,
                          warmup: props.partialStorage?.settings.timers.warmup ?? 90,
                        },
                        units: settings.units,
                      },
                    };
                    console.log(exportedProgram);
                    const programBuilderUrl = UrlUtils.build("/program", __HOST__);
                    const fullurl = await Encoder.encodeIntoUrl(
                      JSON.stringify(exportedProgram),
                      programBuilderUrl.toString()
                    );
                    const url = await service.postShortUrl(fullurl.toString(), "p");
                    ClipboardUtils.copy(url);
                    setShowLiftosaurConvertInfo(url);
                  }}
                >
                  Convert to Liftosaur program
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      {showClipboardInfo && (
        <div className="mb-2 text-xs text-left sm:text-right text-grayv2-main">
          Copied to clipboard:{" "}
          <a target="_blank" className="font-bold underline text-bluev2" href={showClipboardInfo}>
            {showClipboardInfo}
          </a>
        </div>
      )}
      {showLiftosaurConvertInfo && (
        <div className="mb-2 text-xs text-left sm:text-right text-grayv2-main">
          Copied Liftosaur program to clipboard:{" "}
          <a target="_blank" className="font-bold underline text-bluev2" href={showLiftosaurConvertInfo}>
            {showLiftosaurConvertInfo}
          </a>
        </div>
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
      {modalExerciseUi && (
        <ModalExercise
          isHidden={!modalExerciseUi}
          onChange={(exerciseId) => {
            window.isUndoing = true;
            dispatch([
              lb<IPlannerState>().p("ui").p("modalExercise").record(undefined),
              lb<IPlannerState>().p("ui").p("focusedExercise").record(undefined),
              state.fulltext
                ? lb<IPlannerState>()
                    .pi("fulltext")
                    .p("text")
                    .recordModify((text) => {
                      if (!exerciseId) {
                        return text;
                      }
                      const line = state.fulltext?.currentLine;
                      if (line == null) {
                        return text;
                      }
                      const exercise = Exercise.getById(exerciseId, settings.exercises);
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
                      if (!exerciseId) {
                        return exerciseText;
                      }
                      const exercise = Exercise.getById(exerciseId, settings.exercises);
                      return exerciseText + `\n${exercise.name}`;
                    }),
            ]);
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
            equipment: IEquipment,
            targetMuscles: IMuscle[],
            synergistMuscles: IMuscle[],
            types: IExerciseKind[],
            exercise?: ICustomExercise
          ) => {
            const exercises = Exercise.createOrUpdateCustomExercise(
              settings.exercises,
              name,
              equipment,
              targetMuscles,
              synergistMuscles,
              types,
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
                .set(ObjectUtils.omit(settings.exercises, [id]))
            );
          }}
          settings={{ ...Settings.build(), exercises: settings.exercises }}
          customExerciseName={modalExerciseUi.customExerciseName}
          initialFilterTypes={[...modalExerciseUi.muscleGroups, ...modalExerciseUi.types].map(StringUtils.capitalize)}
        />
      )}
    </section>
  );
}
