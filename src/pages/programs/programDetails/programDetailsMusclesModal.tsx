import { lb } from "lens-shmens";
import React, { JSX } from "react";
import { LftModal } from "../../../components/modal";
import { MusclesView } from "../../../components/muscles/musclesView";
import { IPoints, Muscle } from "../../../models/muscle";
import { IProgram, ISettings } from "../../../types";
import { IProgramDetailsDispatch, IProgramDetailsMuscles, IProgramDetailsState } from "./types";

interface IProps {
  muscles: IProgramDetailsMuscles;
  program: IProgram;
  settings: ISettings;
  dispatch: IProgramDetailsDispatch;
}

export function ProgramDetailsMusclesModal(props: IProps): JSX.Element {
  let points: IPoints;
  if (props.muscles.type === "program") {
    points = Muscle.normalizePoints(Muscle.getPointsForProgram(props.program, props.settings));
  } else {
    const day = props.program.days[props.muscles.dayIndex];
    points = Muscle.normalizePoints(Muscle.getPointsForDay(props.program, day, props.settings));
  }

  return (
    <LftModal
      shouldShowClose={true}
      onClose={() => props.dispatch(lb<IProgramDetailsState>().p("muscles").record(undefined))}
    >
      <div style={{ maxWidth: "400px" }}>
        <MusclesView settings={props.settings} points={points} title={props.program.name} />
      </div>
    </LftModal>
  );
}
