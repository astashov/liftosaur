import { JSX, h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { BottomSheet } from "./bottomSheet";
import { IconArrowDown2 } from "./icons/iconArrowDown2";

interface IInputSelectProps<T extends string> {
  name: string;
  includeEmpty?: boolean;
  value?: T;
  values?: [T, string][];
  onChange?: (v?: T) => void;
}

export function InputSelect<T extends string>(props: IInputSelectProps<T>): JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const selectedLabel = props.values?.find((v) => v[0] === props.value)?.[1];

  return (
    <>
      <button
        className="flex items-center w-full gap-2 p-2 text-left border rounded border-grayv3-200"
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex-1 text-base">{selectedLabel}</div>
        <div>
          <IconArrowDown2 />
        </div>
      </button>
      {props.values && props.values.length > 0 && (
        <BottomSheet shouldShowClose={true} onClose={() => setIsExpanded(false)} isHidden={!isExpanded}>
          <div className="flex flex-col px-4 py-2">
            {props.values?.map(([key, value], i) => (
              <button
                key={key}
                className={`py-2 ${i !== 0 ? "border-t" : ""} cursor-pointer text-left ${
                  value === props.value ? "bg-grayv3-200" : "border-grayv3-200"
                }`}
                onClick={() => {
                  if (props.onChange) {
                    props.onChange(key);
                  }
                  setIsExpanded(false);
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
