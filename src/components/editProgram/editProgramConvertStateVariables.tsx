import React, { JSX } from "react";
import { ProgramExercise } from "../../models/programExercise";
import { IProgramExercise, ISettings } from "../../types";
import { IconInfo } from "../icons/iconInfo";
import { LinkButton } from "../linkButton";

interface IEditProgramConvertStateVariablesProps {
  programExercise: IProgramExercise;
  settings: ISettings;
  onConvert: () => void;
}

export function EditProgramConvertStateVariables(props: IEditProgramConvertStateVariablesProps): JSX.Element | null {
  const programExercise = props.programExercise;
  const unit = props.settings.units;
  const hasDifferentUnits =
    ProgramExercise.hasDifferentUnitStateVariables(programExercise, unit) ||
    ProgramExercise.hasDifferentWarmupUnits(programExercise, unit);

  if (!hasDifferentUnits) {
    return null;
  }

  const oppositeUnit = unit === "kg" ? "lb" : "kg";

  return (
    <div className="flex items-center text-xs">
      <div className="mr-4">
        <IconInfo />
      </div>
      <div className="flex-1">
        Some state variables or warmups of this exercise use <strong>{oppositeUnit}</strong>, but you set{" "}
        <strong>{unit}</strong> in settings.
        <br />
        <LinkButton name="change-unit" onClick={props.onConvert}>
          Change them to {unit}
        </LinkButton>
      </div>
    </div>
  );
}
