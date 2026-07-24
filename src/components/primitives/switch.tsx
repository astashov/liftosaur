import React, { JSX } from "react";

interface ISwitchProps {
  value: boolean | undefined;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

export function Switch(props: ISwitchProps): JSX.Element {
  return (
    <input
      type="checkbox"
      className="checkbox text-text-link"
      checked={!!props.value}
      disabled={props.disabled}
      data-testid={props.testID}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        props.onValueChange(e.currentTarget.checked);
      }}
    />
  );
}
