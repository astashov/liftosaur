import { h, JSX } from "preact";
import { IProgramExerciseExample } from "../../models/programExercise";
import { Weight } from "../../models/weight";
import { StringUtils } from "../../utils/string";
import { GroupHeader } from "../groupHeader";
import { LinkButton } from "../linkButton";
import { SetNumber } from "./editProgramSets";
import Prism from "prismjs";
import { InternalLink } from "../../internalLink";
import { IUnit } from "../../types";

interface IEditProgramExerciseExamplesProps {
  unit: IUnit;
  onSelect: (example: IProgramExerciseExample) => void;
}

function getExamples(unit: IUnit): IProgramExerciseExample[] {
  const defaultWeight = unit === "lb" ? Weight.build(100, "lb") : Weight.build(40, "kg");
  const defaultBump = unit === "kg" ? "2.5kg" : "5lb";

  return [
    {
      title: "Linear progression",
      description:
        "We increase the weight every successful workout. This good for beginners, while you're getting newbie gains",
      sets: [
        {
          repsExpr: "5",
          weightExpr: "state.weight",
          isAmrap: false,
        },
      ],
      finishDayExpr: StringUtils.unindent(`
        if (completedReps >= reps) {
          state.weight = state.weight + ${defaultBump}
        }
      `),
      state: {
        weight: defaultWeight,
      },
      rules: {
        sets: "keep",
        reps: "keep",
        weight: "keep_if_has_vars",
      },
    },

    {
      title: "Linear progression after N successes",
      description: "We increase weight after N successful workouts. It allows to slow down the linear growth a bit.",
      sets: [
        {
          repsExpr: "5",
          weightExpr: "state.weight",
          isAmrap: false,
        },
      ],
      finishDayExpr: StringUtils.unindent(`
        if (completedReps >= reps) {
          state.successes = state.successes + 1
        }
        if (state.successes > 2) {
          state.successes = 0
          state.weight = state.weight + ${defaultBump}
        }
      `),
      state: {
        weight: defaultWeight,
        successes: 0,
      },
      rules: {
        sets: "keep",
        reps: "keep",
        weight: "keep_if_has_vars",
      },
    },

    {
      title: "Linear progression with deload",
      description: "Similar to Linear Progression, but we also deload on 3rd unsuccessful attempt",
      sets: [
        {
          repsExpr: "5",
          weightExpr: "state.weight",
          isAmrap: false,
        },
      ],
      finishDayExpr: StringUtils.unindent(`
        if (completedReps >= reps) {
          state.weight = state.weight + ${defaultBump}
        } else {
          state.failures = state.failures + 1
        }
        if (state.failures > 2) {
          state.failures = 0
          state.weight = state.weight * 0.9
        }
      `),
      state: {
        weight: defaultWeight,
        failures: 0,
      },
      rules: {
        sets: "keep",
        reps: "keep",
        weight: "keep_if_has_vars",
      },
    },

    {
      title: "Double progression",
      description:
        "We increase reps from 8 to 12, then increase weight and reset reps to 8. This works well for isolation exercises.",
      sets: [
        {
          repsExpr: "state.reps",
          weightExpr: "state.weight",
          isAmrap: false,
        },
      ],
      finishDayExpr: StringUtils.unindent(`
        if (completedReps >= reps) {
          state.reps = state.reps + 1
        }
        if (state.reps > 12) {
          state.reps = 8
          state.weight = state.weight + ${defaultBump}
        }
      `),
      state: {
        reps: 8,
        weight: defaultWeight,
      },
      rules: {
        sets: "keep",
        reps: "keep_if_has_vars",
        weight: "keep_if_has_vars",
      },
    },

    {
      title: "At least one more rep",
      description:
        "Similar to Linear Progression, but we only consider it failure if you lifted less than last time. I.e if you need to lift 2x12, and you lifted 12 and 6 reps, but last time you lifted 12 and 4 reps, we don't consider it a failure. We'll increase weight only when you lift 2x12 though.",
      sets: [
        {
          repsExpr: "12",
          weightExpr: "state.weight",
          isAmrap: false,
        },
      ],
      finishDayExpr: StringUtils.unindent(`
        if (completedReps >= reps) {
          state.weight = state.weight + ${defaultBump}
          state.failures = 0
          state.lastReps = 0
        } else {
          if (completedReps[1] + completedReps[2] <= state.lastReps) {
            state.failures = state.failures + 1
          } else {
            state.lastReps = completedReps[1] + completedReps[2]
          }
          if (state.failures >= 3) {
            state.weight = state.weight - ${defaultBump}
            state.lastReps = 0
            state.failures = 0
          }
        }
      `),
      state: {
        weight: defaultWeight,
        lastReps: 0,
        failures: 0,
      },
      rules: {
        sets: "keep",
        reps: "keep",
        weight: "keep_if_has_vars",
      },
    },

    {
      title: "5/3/1",
      description:
        "Often used in Jim Wendler's 5/3/1 programs, where we use percentage of training max for weights, and increase weight every 3 weeks.",
      sets: [
        {
          repsExpr: "5",
          weightExpr: "state.weight * 0.75",
          isAmrap: false,
        },
        { repsExpr: "3", weightExpr: "state.weight * 0.85", isAmrap: false },
        { repsExpr: "1", weightExpr: "state.weight * 0.95", isAmrap: true },
      ],
      finishDayExpr: StringUtils.unindent(`
          // Increase weight every 3 weeks
          if (day == 9) {
            state.weight = state.weight + ${defaultBump}
          }
        `),
      state: {
        weight: defaultWeight,
      },
      rules: {
        sets: "replace",
        reps: "replace",
        weight: "replace",
      },
    },
  ];
}

export function EditProgramExerciseExamples(props: IEditProgramExerciseExamplesProps): JSX.Element {
  const examples = getExamples(props.unit);
  return (
    <section className="text-sm">
      <div className="my-2">
        <InternalLink className="font-bold underline text-bluev2" href="/docs/docs.html" name="liftoscript-tutorial">
          Check the tutorial for Liftoscript
        </InternalLink>
      </div>
      {examples.map((example, i) => {
        const finishDayExpr = Prism.highlight(example.finishDayExpr, Prism.languages.javascript, "javascript");
        return (
          <section className={`${i !== 0 && "border-t border-grayv2-200 pt-8 mt-8"}`}>
            <h3 className="text-lg font-bold">{example.title}</h3>
            <h4 className="mt-1 mb-2 text-xs leading-4 text-grayv2-main">{example.description}</h4>
            <div className="flex flex-col sm:flex-row" style={{ gap: "0.5rem" }}>
              <div className="flex-1 min-w-0">
                <GroupHeader name="Sets" />
                {example.sets.map((set, setIndex) => {
                  return (
                    <div className="flex items-center px-2 py-1 my-1 rounded-lg bg-purplev2-100">
                      <SetNumber setIndex={setIndex} />
                      <Field flex={2} label="Reps" right={set.isAmrap ? "AMRAP" : undefined} value={set.repsExpr} />
                      <Field flex={3} label="Weight" value={set.weightExpr} />
                    </div>
                  );
                })}
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <GroupHeader name="Finish Day Script" />
                <pre
                  className="block p-2 my-1 overflow-auto border rounded-lg border-grayv2-300 code"
                  dangerouslySetInnerHTML={{ __html: finishDayExpr }}
                />
              </div>
            </div>
            <div>
              <LinkButton onClick={() => props.onSelect(example)}>Use this example</LinkButton>
            </div>
          </section>
        );
      })}
    </section>
  );
}

function Field(props: { flex: number; label: string; value: string; right?: string }): JSX.Element {
  const value = Prism.highlight(props.value, Prism.languages.javascript, "javascript");
  return (
    <div
      className="relative min-w-0 ml-2 leading-none bg-white border rounded-lg border-purplev2-300"
      style={{ flex: props.flex, padding: "1.125rem 0.5rem 0.25rem 0.5rem" }}
    >
      <div className="absolute text-xs text-grayv2-500" style={{ top: "2px", left: "8px" }}>
        {props.label}
      </div>
      {props.right && (
        <div className="absolute text-xs text-grayv2-500" style={{ top: "2px", right: "8px" }}>
          {props.right}
        </div>
      )}
      <pre className="block overflow-auto font-bold leading-5 code" dangerouslySetInnerHTML={{ __html: value }} />
    </div>
  );
}
