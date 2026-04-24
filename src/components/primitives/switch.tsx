import React, { JSX } from "react";

interface ISwitchProps {
  value: boolean | undefined;
  onValueChange: (value: boolean) => void;
  testID?: string;
  "data-cy"?: string;
}

export function Switch(props: ISwitchProps): JSX.Element {
  return (
    <input
      type="checkbox"
      className="checkbox text-text-link"
      checked={!!props.value}
      data-cy={props["data-cy"]}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        props.onValueChange(e.currentTarget.checked);
      }}
    />
  );
}
