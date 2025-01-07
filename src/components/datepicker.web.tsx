import { DateUtils } from "../utils/date";

interface IDatepickerProps {
  value: number;
  onChange: (timestamp: number) => void;
}

export function Datepicker(props: IDatepickerProps): JSX.Element {
  return (
    <input
      className="inline-block py-2 text-bluev2"
      data-cy="input-stats-date"
      type="date"
      onChange={(e) => {
        const date = Date.parse(e.currentTarget.value + "T00:00:00");
        props.onChange(date);
      }}
      value={DateUtils.formatYYYYMMDD(props.value)}
    />
  );
}
