import React, { JSX } from "react";
import { IProgram, ISettings } from "../../../types";
import { MusclesView } from "../../../components/muscles/musclesView";
import { Muscle } from "../../../models/muscle";

export interface IProgramContentMusclesProps {
  program: IProgram;
  settings: ISettings;
}

export function ProgramContentMuscles(props: IProgramContentMusclesProps): JSX.Element {
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(props.program, props.settings));
  return <MusclesView title="Muscle balance for program" points={points} settings={props.settings} />;
}
