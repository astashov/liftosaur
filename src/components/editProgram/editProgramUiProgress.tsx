import { JSX } from "react";
import { View } from "react-native";
import { FastText } from "../primitives/fastText";
import { StyledText, StyledText_cls } from "../../utils/styledText";
import { useRem } from "../../utils/useRem";
import { Weight_print } from "../../models/weight";
import {
  PlannerProgramExercise_progressionType,
  PlannerProgramExercise_getState,
} from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IEvaluatedProgram, Program_getReusingProgressExercises } from "../../models/program";

interface IEditProgramUiProgressProps {
  evaluatedProgram: IEvaluatedProgram;
  exercise: IPlannerProgramExercise;
}

export function EditProgramUiProgress(props: IEditProgramUiProgressProps): JSX.Element | null {
  let reusingLine: JSX.Element | null = null;
  let reusedByLine: JSX.Element | null = null;
  let progressExercise: IPlannerProgramExercise | undefined = undefined;
  const { evaluatedProgram, exercise } = props;
  if (exercise.progress?.reuse) {
    progressExercise = exercise.progress.reuse.exercise ?? exercise.reuse?.exercise;
    reusingLine = <ReusingLine fullName={exercise.progress.reuse?.fullName} />;
  } else if (exercise.progress) {
    progressExercise = exercise;
    const reusingProgressExercises = Program_getReusingProgressExercises(evaluatedProgram, exercise);
    if (reusingProgressExercises.length > 0) {
      reusedByLine = <ReusedByLine names={reusingProgressExercises.map((e) => e.fullName)} />;
    }
  }

  if (progressExercise == null) {
    return null;
  }
  return (
    <View>
      <View>{reusingLine}</View>
      <Progression progressExercise={progressExercise} originalExercise={props.exercise} />
      <View>{reusedByLine}</View>
    </View>
  );
}

function ReusingLine(props: { fullName?: string }): JSX.Element {
  const cls = StyledText_cls(useRem());
  const builder = new StyledText();
  builder.add("Reusing progress of '", cls("text-xs"));
  builder.add(props.fullName, cls("text-xs font-bold"));
  builder.add("'", cls("text-xs"));
  const built = builder.build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-xs text-text-primary")} />;
}

function ReusedByLine(props: { names: string[] }): JSX.Element {
  const cls = StyledText_cls(useRem());
  const bold = cls("font-bold");
  const builder = new StyledText();
  builder.add("This progress reused by: ");
  props.names.forEach((name, i) => {
    builder.add(i !== 0 ? ", " : "");
    builder.add(name, bold);
  });
  builder.add(".");
  const built = builder.build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-xs text-text-primary")} />;
}

interface IProgressionProps {
  progressExercise: IPlannerProgramExercise;
  originalExercise: IPlannerProgramExercise;
}

function Progression(props: IProgressionProps): JSX.Element {
  const cls = StyledText_cls(useRem());
  const base = cls("text-xs text-text-primary");
  const bold = cls("font-bold");
  const success = cls("font-bold text-text-success");
  const error = cls("font-bold text-text-error");
  const type = props.progressExercise ? PlannerProgramExercise_progressionType(props.progressExercise) : undefined;
  if (type == null) {
    return <View />;
  }
  switch (type.type) {
    case "linear": {
      const builder = new StyledText();
      builder.add("Linear Progression:", bold);
      builder.add(" ");
      builder.add(`+${Weight_print(type.increase)}`, success);
      if (type.successesRequired || 0 > 1) {
        builder.add(" after ");
        builder.add(`${type.successesRequired}`, success);
        builder.add(" successes");
      }
      if (type.decrease != null && type.decrease.value > 0) {
        builder.add(", ");
        builder.add(Weight_print(type.decrease), error);
        builder.add(" after ");
        builder.add(`${type.failuresRequired}`, error);
        builder.add(" failures");
      }
      builder.add(".");
      const built = builder.build();
      return (
        <View>
          <FastText text={built.text} fragments={built.fragments} {...base} />
        </View>
      );
    }
    case "double": {
      const builder = new StyledText();
      builder.add("Double Progression", bold);
      builder.add(": ");
      builder.add(`+${Weight_print(type.increase)}`, success);
      builder.add(" within ");
      builder.add(`${type.minReps}`, bold);
      builder.add("-");
      builder.add(`${type.maxReps}`, bold);
      builder.add(" rep range.");
      const built = builder.build();
      return (
        <View>
          <FastText text={built.text} fragments={built.fragments} {...base} />
        </View>
      );
    }
    case "sumreps": {
      const builder = new StyledText();
      builder.add("Sum Reps Progression", bold);
      builder.add(": ");
      builder.add(`+${Weight_print(type.increase)}`, success);
      builder.add(" if sum of all reps is at least ");
      builder.add(`${type.reps}`, bold);
      builder.add(".");
      const built = builder.build();
      return (
        <View>
          <FastText text={built.text} fragments={built.fragments} {...base} />
        </View>
      );
    }
    case "custom": {
      const state = PlannerProgramExercise_getState(props.originalExercise);
      const entries = Object.entries(state);
      const secondary = cls("text-text-secondary");
      const builder = new StyledText();
      entries.forEach(([name, value], i) => {
        builder.add(i !== 0 ? "\n" : "");
        builder.add("•  ");
        builder.add(name, secondary);
        builder.add(": ");
        builder.add(Weight_print(value), bold);
      });
      const built = builder.build();
      return (
        <View>
          <FastText text="Custom Progression" {...cls("text-xs text-text-primary font-bold")} />
          {entries.length > 0 && (
            <View>
              <FastText text="State variables:" {...cls("text-xs text-text-secondary")} />
              <View className="ml-4">
                <FastText text={built.text} fragments={built.fragments} {...base} />
              </View>
            </View>
          )}
        </View>
      );
    }
  }
}
