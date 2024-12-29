import React, { JSX } from "react";
import { memo } from "react";
import { IProgression } from "../../../models/progression";

export const ProgressionView = memo(
  (props: { progression: IProgression }): JSX.Element => {
    const { progression } = props;
    return (
      <span>
        Increase by <span>{progression.increment}</span>
        <span>{progression.unit}</span> after <span>{progression.attempts}</span> successful attempts.
      </span>
    );
  }
);
