import { JSX } from "react";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { useModalDispatch, useModalResult, Modal_open } from "../navigation/ModalStateContext";
import { getNavigationRef } from "../navigation/navUtils";

interface IInputSelectProps<T extends string> {
  name: string;
  label?: string;
  placeholder?: string;
  expandValue?: boolean;
  hint?: string;
  disabled?: boolean;
  value?: T;
  values?: [T, string][];
  onChange?: (v?: T) => void;
}

export function InputSelect<T extends string>(props: IInputSelectProps<T>): JSX.Element {
  if (props.label != null) {
    return (
      <div className="flex items-center gap-4">
        <label className={`${!props.expandValue ? "flex-1" : ""} text-sm`}>{props.label}</label>
        <div className="flex-1">
          <InputSelectValue {...props} />
        </div>
      </div>
    );
  } else {
    return <InputSelectValue {...props} />;
  }
}

export function InputSelectValue<T extends string>(props: IInputSelectProps<T>): JSX.Element {
  const modalDispatch = useModalDispatch();
  const selectedLabel = props.values?.find((v) => v[0] === props.value)?.[1];

  useModalResult("inputSelectModal", (value) => {
    if (props.onChange) {
      props.onChange(value as T | undefined);
    }
  });

  return (
    <button
      data-cy={`select-${props.name}`}
      className="flex items-center w-full gap-2 p-2 text-left border rounded bg-background-default border-border-neutral"
      onClick={() => {
        if (!props.disabled && props.values && props.values.length > 0) {
          Modal_open(modalDispatch, "inputSelectModal", {
            values: props.values,
            hint: props.hint,
            selectedValue: props.value,
            placeholder: props.placeholder,
          });
          getNavigationRef().then(({ navigationRef: ref }) => ref.navigate("inputSelectModal"));
        }
      }}
    >
      <div className="flex-1 text-sm">
        {selectedLabel ?? <span className="text-text-secondary">{props.placeholder}</span>}
      </div>
      <div>
        <IconArrowDown2 />
      </div>
    </button>
  );
}
