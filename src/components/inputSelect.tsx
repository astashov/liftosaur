import { JSX, h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { BottomSheet } from "./bottomSheet";
import { IconArrowDown2 } from "./icons/iconArrowDown2";

interface IInputSelectProps<T extends string> {
  name: string;
  label?: string;
  placeholder?: string;
  expandValue?: boolean;
  hint?: string;
  disabled?: boolean;
  value?: T;
  values?: [T, string | JSX.Element][];
  onChange?: (v?: T) => void;
}

export function InputSelect<T extends string>(props: IInputSelectProps<T>): JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (props.label != null) {
    return (
      <div className="flex items-center gap-4">
        <label
          className={`${!props.expandValue ? "flex-1" : ""} text-sm`}
          onClick={() => {
            if (!props.disabled) {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          {props.label}
        </label>
        <div className="flex-1">
          <InputSelectValue {...props} setIsExpanded={setIsExpanded} isExpanded={isExpanded} />
        </div>
      </div>
    );
  } else {
    return <InputSelectValue {...props} setIsExpanded={setIsExpanded} isExpanded={isExpanded} />;
  }
}

export function InputSelectValue<T extends string>(
  props: IInputSelectProps<T> & {
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
  }
): JSX.Element {
  const { isExpanded, setIsExpanded } = props;
  const selectedLabel = props.values?.find((v) => v[0] === props.value)?.[1];

  return (
    <>
      <button
        data-cy={`select-${props.name}`}
        className="flex items-center w-full gap-2 p-2 text-left bg-white border rounded border-grayv3-200"
        onClick={() => {
          if (!props.disabled) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex-1 text-sm">
          {selectedLabel ?? <span className="text-grayv3-main">{props.placeholder}</span>}
        </div>
        <div>
          <IconArrowDown2 />
        </div>
      </button>
      {props.values && props.values.length > 0 && (
        <BottomSheet shouldShowClose={true} onClose={() => setIsExpanded(false)} isHidden={!isExpanded}>
          {props.hint && <div className="pt-1 pl-2 pr-8 text-xs text-grayv3-main">{props.hint}</div>}
          <div className="flex flex-col px-2 py-2" data-cy={`select-options-${props.name}`}>
            {props.values?.map(([key, value], i) => (
              <button
                data-cy={`select-option-${key}`}
                key={key}
                className={`py-2 px-2 ${i !== 0 && value !== props.value ? "border-t" : ""} cursor-pointer text-left ${
                  value === props.value ? "bg-grayv3-100 rounded" : "border-grayv3-200"
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
