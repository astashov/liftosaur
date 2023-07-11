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
import { parser as plannerExerciseParser } from "./plannerExerciseParser";
import { ScrollableTabs } from "../../components/scrollableTabs";
import { LinkButton } from "../../components/linkButton";
import { ObjectUtils } from "../../utils/object";
import { CollectionUtils } from "../../utils/collection";
import { PlannerWeekStats } from "./components/plannerWeekStats";
import { PlannerDay } from "./components/plannerDay";
import { Encoder } from "../../utils/encoder";
import { useMemo, useState } from "preact/hooks";
import { PlannerExerciseEvaluator } from "./plannerExerciseEvaluator";
import { IconCog2 } from "../../components/icons/iconCog2";
import { ModalPlannerSettings } from "./components/modalPlannerSettings";
import { ModalExercise } from "../../components/modalExercise";
import { Settings } from "../../models/settings";

export interface IPlannerContentProps {
  client: Window["fetch"];
  initialProgram?: IExportedPlannerProgram;
}

export function PlannerContent(props: IPlannerContentProps): JSX.Element {
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
  ]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const lbProgram = lb<IPlannerState>().p("current").p("program");
  const program = state.current.program;

  const evaluatedWeeks = useMemo(() => {
    return state.current.program.weeks.map((week) => {
      return week.days.map((day) => {
        const tree = plannerExerciseParser.parse(day.exerciseText);
        const evaluator = new PlannerExerciseEvaluator(day.exerciseText);
        return evaluator.evaluate(tree.topNode);
      });
    });
  }, [state.current.program]);

  return (
    <section className="px-4">
      <h1 className="mb-4 text-2xl font-bold">Weightlifting Program Planner</h1>
      <div className="flex">
        <h2 className="flex-1 pb-4 mr-2 text-2xl font-bold">
          <BuilderLinkInlineInput
            value={state.current.program.name}
            onInputString={(v) => {
              dispatch(lbProgram.p("name").record(v));
              document.title = `Liftosaur: Weight Lifting Tracking App | ${HtmlUtils.escapeHtml(v)}`;
            }}
          />
        </h2>
        <div>
          <button onClick={() => setIsSettingsModalOpen(true)} className="p-2">
            <IconCog2 />
          </button>
        </div>
      </div>
      <div>
        <ScrollableTabs
          tabs={program.weeks.map((week, weekIndex) => {
            return [
              week.name,
              <div key={weekIndex} className="flex">
                <div className="flex-1">
                  <h3 className="mr-2 text-xl font-bold">
                    <BuilderLinkInlineInput
                      value={week.name}
                      onInputString={(v) => {
                        dispatch(lbProgram.p("weeks").i(weekIndex).p("name").record(v));
                      }}
                    />
                  </h3>
                  <div className="mb-4">
                    <span className="mr-2">
                      <LinkButton
                        onClick={() => {
                          dispatch(
                            lbProgram.p("weeks").recordModify((weeks) => CollectionUtils.removeAt(weeks, weekIndex))
                          );
                        }}
                      >
                        Delete Week
                      </LinkButton>
                    </span>
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
                <div className="ml-4" style={{ width: "14rem" }}>
                  <PlannerWeekStats
                    dispatch={dispatch}
                    evaluatedDays={evaluatedWeeks[weekIndex]}
                    settings={state.settings}
                  />
                </div>
              </div>,
            ];
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
      {state.ui.modalExercise && (
        <ModalExercise
          isHidden={!state.ui.modalExercise}
          onChange={() => undefined}
          onCreateOrUpdate={() => undefined}
          onDelete={() => undefined}
          settings={Settings.build()}
        />
      )}
    </section>
  );
}
