import { JSX } from "react";
import { View } from "react-native";
import { FastText } from "../primitives/fastText";
import { StyledText, StyledText_cls } from "../../utils/styledText";
import { useRem } from "../../utils/useRem";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IEvaluatedProgram, Program_getReusingUpdateExercises } from "../../models/program";
import { CollectionUtils_uniqBy } from "../../utils/collection";

interface IEditProgramUiUpdateProps {
  evaluatedProgram: IEvaluatedProgram;
  exercise: IPlannerProgramExercise;
}

export function EditProgramUiUpdate(props: IEditProgramUiUpdateProps): JSX.Element | null {
  let reusingLine: JSX.Element | null = null;
  let reusedByLine: JSX.Element | null = null;
  let progressExercise: IPlannerProgramExercise | undefined = undefined;
  const { evaluatedProgram, exercise } = props;
  if (exercise.update?.reuse) {
    progressExercise = exercise.update.reuse.exercise;
    reusingLine = <ReusingLine fullName={exercise.update.reuse?.fullName} />;
  } else if (exercise.update) {
    progressExercise = exercise;
    const reusingUpdateExercises = CollectionUtils_uniqBy(
      Program_getReusingUpdateExercises(evaluatedProgram, exercise),
      "fullName"
    );
    if (reusingUpdateExercises.length > 0) {
      reusedByLine = <ReusedByLine names={reusingUpdateExercises.map((e) => e.fullName)} />;
    }
  }

  if (progressExercise == null) {
    return null;
  }
  return (
    <View>
      <View>{reusingLine}</View>
      <View>
        <CustomUpdateLabel />
      </View>
      <View>{reusedByLine}</View>
    </View>
  );
}

function CustomUpdateLabel(): JSX.Element {
  return <FastText text="Custom Update" {...StyledText_cls(useRem())("text-xs text-text-primary font-bold")} />;
}

function ReusingLine(props: { fullName?: string }): JSX.Element {
  const cls = StyledText_cls(useRem());
  const builder = new StyledText();
  builder.add("Reusing update of '", cls("text-xs"));
  builder.add(props.fullName, cls("text-xs font-bold"));
  builder.add("'", cls("text-xs"));
  const built = builder.build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-xs text-text-primary")} />;
}

function ReusedByLine(props: { names: string[] }): JSX.Element {
  const cls = StyledText_cls(useRem());
  const bold = cls("font-bold");
  const builder = new StyledText();
  builder.add("This update reused by: ");
  props.names.forEach((name, i) => {
    builder.add(i !== 0 ? ", " : "");
    builder.add(name, bold);
  });
  builder.add(".");
  const built = builder.build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-xs text-text-primary")} />;
}
