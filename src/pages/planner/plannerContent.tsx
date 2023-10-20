import { h, JSX } from "preact";
import { useLensReducer } from "../../utils/useLensReducer";
import {
  IPlannerProgram,
  IPlannerState,
  IPlannerSettings,
  IPlannerProgramWeek,
  IPlannerProgramDay,
  IExportedPlannerProgram,
} from "./models/types";
import { BuilderLinkInlineInput } from "../builder/components/builderInlineInput";
import { lb } from "lens-shmens";
import { HtmlUtils } from "../../utils/html";
import { ScrollableTabs } from "../../components/scrollableTabs";
import { LinkButton } from "../../components/linkButton";
import { ObjectUtils } from "../../utils/object";
import { CollectionUtils } from "../../utils/collection";
import { PlannerWeekStats } from "./components/plannerWeekStats";
import { PlannerDay } from "./components/plannerDay";
import { Encoder } from "../../utils/encoder";
import { useEffect, useMemo, useState } from "preact/hooks";
import { IconCog2 } from "../../components/icons/iconCog2";
import { ModalPlannerSettings } from "./components/modalPlannerSettings";
import { ModalExercise } from "../../components/modalExercise";
import { Settings } from "../../models/settings";
import { StringUtils } from "../../utils/string";
import { Exercise } from "../../models/exercise";
import { undoRedoMiddleware, useUndoRedo } from "../builder/utils/undoredo";
import { BuilderCopyLink } from "../builder/components/builderCopyLink";
import { ICustomExercise, IEquipment, IExerciseKind, IMuscle } from "../../types";
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

declare let __HOST__: string;

export interface IPlannerContentProps {
  client: Window["fetch"];
  initialProgram?: IExportedPlannerProgram;
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

  const initialSettings: IPlannerSettings = props.initialProgram?.settings || {
    unit: "lb",
    strengthSetsPct: 30,
    hypertrophySetsPct: 70,
    weeklyRangeSets: {
      shoulders: [10, 12],
      triceps: [10, 12],
      back: [10, 12],
      abs: [10, 12],
      glutes: [10, 12],
      hamstrings: [10, 12],
      quadriceps: [10, 12],
      chest: [10, 12],
      biceps: [10, 12],
      calves: [10, 12],
      forearms: [10, 12],
    },
    weeklyFrequency: {
      shoulders: 2,
      triceps: 2,
      back: 2,
      abs: 2,
      glutes: 2,
      hamstrings: 2,
      quadriceps: 2,
      chest: 2,
      biceps: 2,
      calves: 2,
      forearms: 2,
    },
    synergistMultiplier: 0.5,
    customExercises: {},
    restTimer: 180,
  };

  const initialState: IPlannerState = {
    settings: initialSettings,
    current: {
      program: initialProgram,
    },
    ui: {},
    history: {
      past: [],
      future: [],
    },
  };
  const [state, dispatch] = useLensReducer(initialState, { client: props.client }, [
    async (action, oldState, newState) => {
      if (oldState.current.program !== newState.current.program || oldState.settings !== newState.settings) {
        const exportedProgram: IExportedPlannerProgram = {
          program: newState.current.program,
          settings: newState.settings,
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
  useUndoRedo(state, dispatch);
  useEffect(() => {
    setShowHelp(typeof window !== "undefined" && window.localStorage.getItem("hide-planner-help") !== "true");
  }, []);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showClipboardInfo, setShowClipboardInfo] = useState<string | undefined>(undefined);
  const [showLiftosaurConvertInfo, setShowLiftosaurConvertInfo] = useState<string | undefined>(undefined);
  const [showHelp, setShowHelp] = useState(false);

  const lbProgram = lb<IPlannerState>().p("current").p("program");
  const program = state.current.program;

  const evaluatedWeeks = useMemo(() => {
    return PlannerProgram.evaluate(state.current.program, state.settings.customExercises);
  }, [state.current.program, state.settings.customExercises]);

  const modalExerciseUi = state.ui.modalExercise;
  const isInvalid = !PlannerProgram.isValid(state.current.program, state.settings.customExercises);

  const script = "Squat / 3x3-5\nRomanian Deadlift / 3x8";

  return (
    <section className="px-4">
      <h1 className="flex items-center mb-4 text-2xl font-bold leading-tight">
        <div>Workout Planner</div>
        {!showHelp && (
          <button
            className="block ml-3"
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
          className="absolute "
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
          <BuilderCopyLink
            suppressShowInfo={true}
            onShowInfo={setShowClipboardInfo}
            type="n"
            program={program}
            client={props.client}
          />
          <div>
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2">
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
                const liftosaurProgram = new PlannerToProgram(
                  state.current.program,
                  state.settings.customExercises,
                  state.settings.unit
                ).convert();
                const exportedProgram: IExportedProgram = {
                  program: liftosaurProgram,
                  customExercises: state.settings.customExercises,
                  version: getLatestMigrationVersion(),
                  settings: { timers: { workout: 180, warmup: 90 }, units: state.settings.unit },
                };
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
        <ScrollableTabs
          tabs={program.weeks.map((week, weekIndex) => {
            return {
              label: week.name,
              isInvalid: evaluatedWeeks[weekIndex].some((day) => !day.success),
              children: (
                <div key={weekIndex} className="flex flex-col md:flex-row">
                  <div className="flex-1">
                    <h3 className="mr-2 text-xl font-bold">
                      <BuilderLinkInlineInput
                        value={week.name}
                        onInputString={(v) => {
                          dispatch(lbProgram.p("weeks").i(weekIndex).p("name").record(v));
                        }}
                      />
                    </h3>
                    <div className="mt-1 mb-4">
                      {program.weeks.length > 1 && (
                        <span className="mr-2">
                          <LinkButton
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this week?")) {
                                dispatch(
                                  lbProgram
                                    .p("weeks")
                                    .recordModify((weeks) => CollectionUtils.removeAt(weeks, weekIndex))
                                );
                              }
                            }}
                          >
                            Delete Week
                          </LinkButton>
                        </span>
                      )}
                      <span className="mr-2">
                        <LinkButton
                          onClick={() => {
                            dispatch(
                              lbProgram.p("weeks").recordModify((weeks) => [
                                ...weeks,
                                {
                                  ...ObjectUtils.clone(initialWeek),
                                  name: `Week ${weeks.length + 1}`,
                                },
                              ])
                            );
                          }}
                        >
                          Add New Week
                        </LinkButton>
                      </span>
                      <LinkButton
                        onClick={() => {
                          dispatch(
                            lbProgram.p("weeks").recordModify((weeks) => [
                              ...weeks,
                              {
                                ...ObjectUtils.clone(week),
                                name: `Week ${weeks.length + 1}`,
                              },
                            ])
                          );
                        }}
                      >
                        Duplicate Week
                      </LinkButton>
                    </div>
                    {week.days.map((day, dayIndex) => {
                      return (
                        <div key={dayIndex}>
                          <PlannerDay
                            evaluatedWeeks={evaluatedWeeks}
                            settings={state.settings}
                            program={program}
                            dispatch={dispatch}
                            day={day}
                            weekIndex={weekIndex}
                            dayIndex={dayIndex}
                            ui={state.ui}
                            lbProgram={lbProgram}
                            service={service}
                          />
                        </div>
                      );
                    })}
                    <div>
                      <LinkButton
                        onClick={() => {
                          dispatch(
                            lbProgram
                              .p("weeks")
                              .i(weekIndex)
                              .p("days")
                              .recordModify((days) => [
                                ...days,
                                {
                                  ...ObjectUtils.clone(initialDay),
                                  name: `Day ${days.length + 1}`,
                                },
                              ])
                          );
                        }}
                      >
                        Add Day
                      </LinkButton>
                    </div>
                  </div>
                  <div className="mt-2 ml-0 sm:ml-4 sm:mt-0" style={{ width: "14rem" }}>
                    <PlannerWeekStats
                      dispatch={dispatch}
                      evaluatedDays={evaluatedWeeks[weekIndex]}
                      settings={state.settings}
                    />
                  </div>
                </div>
              ),
            };
          })}
        />
      </div>
      {isSettingsModalOpen && (
        <ModalPlannerSettings
          dispatch={dispatch}
          settings={state.settings}
          onClose={() => setIsSettingsModalOpen(false)}
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
              lbProgram
                .p("weeks")
                .i(modalExerciseUi.focusedExercise.weekIndex)
                .p("days")
                .i(modalExerciseUi.focusedExercise.dayIndex)
                .p("exerciseText")
                .recordModify((exerciseText) => {
                  if (!exerciseId) {
                    return exerciseText;
                  }
                  const exercise = Exercise.getById(exerciseId, {});
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
            name: string,
            equipment: IEquipment,
            targetMuscles: IMuscle[],
            synergistMuscles: IMuscle[],
            types: IExerciseKind[],
            exercise?: ICustomExercise
          ) => {
            const exercises = Exercise.createOrUpdateCustomExercise(
              state.settings.customExercises,
              name,
              equipment,
              targetMuscles,
              synergistMuscles,
              types,
              exercise
            );
            dispatch(lb<IPlannerState>().p("settings").p("customExercises").record(exercises));
          }}
          onDelete={(id) => {
            dispatch(
              lb<IPlannerState>()
                .p("settings")
                .p("customExercises")
                .recordModify((exercises) => ObjectUtils.omit(exercises, [id]))
            );
          }}
          settings={{ ...Settings.build(), exercises: state.settings.customExercises }}
          customExerciseName={modalExerciseUi.customExerciseName}
          initialFilterTypes={[...modalExerciseUi.muscleGroups, ...modalExerciseUi.types].map(StringUtils.capitalize)}
        />
      )}
    </section>
  );
}
