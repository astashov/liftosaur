import React, { JSX } from "react";
import { memo } from "react";
import { IDeload } from "../../../models/progression";

export const DeloadView = memo(
  (props: { deload: IDeload }): JSX.Element => {
    const { deload } = props;
    return (
      <span>
        Decrease by <span>{deload.decrement}</span>
        <span>{deload.unit}</span> after <span>{deload.attempts}</span> failed attempts.
      </span>
    );
  }
);
