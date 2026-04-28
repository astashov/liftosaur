import type { JSX } from "react";
import { DateUtils_formatYYYYMMDD } from "../utils/date";

interface IDatePickerProps {
  value: number;
  onChange: (timestamp: number) => void;
  testID?: string;
}

export function DatePicker(props: IDatePickerProps): JSX.Element {
  return (
    <input
      data-cy={props.testID} data-testid={props.testID}
      className="inline-block py-2 text-text-link bg-background-default"
      type="date"
      value={DateUtils_formatYYYYMMDD(props.value)}
      onChange={(e) => {
        const ts = Date.parse(e.currentTarget.value + "T00:00:00");
        if (!isNaN(ts)) {
          props.onChange(ts);
        }
      }}
    />
  );
}
