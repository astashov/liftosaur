import { h, JSX } from "preact";

interface IProps<T extends string, U extends string> {
  left: T;
  right: U;
  selected: T | U;
  onChange: (newValue: T | U) => void;
}

export function Tabs<T extends string, U extends string>(props: IProps<T, U>): JSX.Element {
  const { left, right, selected, onChange } = props;

  return (
    <div className="text-xs text-center">
      <button
        className={`inline-block w-32 px-4 py-1 text-center border border-gray-600 cursor-pointer ${
          selected === left ? "bg-gray-400" : ""
        }`}
        onClick={() => onChange(left)}
        style={{ borderRadius: "10px 0 0 10px" }}
      >
        {left}
      </button>
      <button
        className={`inline-block w-32 px-4 py-1 text-center border border-gray-600 cursor-pointer ${
          selected === right ? "bg-gray-400" : ""
        }`}
        onClick={() => onChange(right)}
        style={{ marginLeft: "-1px", borderRadius: "0 10px 10px 0" }}
      >
        {right}
      </button>
    </div>
  );
}
