import { JSX, forwardRef, memo, useEffect, useRef } from "react";
import { TextInput, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IEither } from "../utils/types";

export function InputAccessoryDone(): null {
  return null;
}

export const inputClassName = "";

export type IValidationError = "required" | "pattern-mismatch";

export interface IProps {
  label?: string;
  identifier?: string;
  type?: string;
  value?: number | string | readonly string[];
  defaultValue?: number | string | readonly string[];
  min?: number;
  max?: number;
  inputSize?: "md" | "sm";
  labelSize?: "xs" | "sm";
  changeHandler?: (e: IEither<string, Set<IValidationError>>) => void;
  multiline?: number;
  changeType?: "onblur" | "oninput";
  isLabelOutside?: boolean;
  errorMessage?: string;
  patternMessage?: string;
  requiredMessage?: string;
  pattern?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  step?: string;
}

export function selectInputOnFocus(): undefined {
  return undefined;
}

export const Input = memo(
  forwardRef(function Input(props: IProps, _ref: unknown): JSX.Element {
    const { label, value: valueProp, changeHandler, min, max, labelSize: labelSizeProp } = props;
    const size = props.inputSize || "md";
    const labelSizeVal = labelSizeProp || "sm";

    const inputRef = useRef<TextInput>(null);
    const currentValueRef = useRef(String(valueProp ?? ""));

    useEffect(() => {
      if (valueProp === undefined) {
        return;
      }
      const newStr = String(valueProp);
      if (currentValueRef.current !== newStr) {
        currentValueRef.current = newStr;
        inputRef.current?.setNativeProps({ text: newStr });
      }
    }, [valueProp]);

    const handleBlur = (): void => {
      if (!changeHandler) {
        return;
      }
      const trimmed = currentValueRef.current.trim();
      if (trimmed === "") {
        changeHandler({ success: false, error: new Set(["required"]) });
        return;
      }
      if (props.type === "number") {
        const num = parseFloat(trimmed);
        if (isNaN(num)) {
          changeHandler({ success: false, error: new Set(["pattern-mismatch"]) });
          return;
        }
        let clamped = num;
        if (min != null) {
          clamped = Math.max(min, clamped);
        }
        if (max != null) {
          clamped = Math.min(max, clamped);
        }
        const result = String(clamped);
        if (currentValueRef.current !== result) {
          currentValueRef.current = result;
          inputRef.current?.setNativeProps({ text: result });
        }
        changeHandler({ success: true, data: result });
      } else {
        changeHandler({ success: true, data: trimmed });
      }
    };

    return (
      <Pressable
        className="border rounded-lg bg-background-default border-border-neutral"
        onPress={() => inputRef.current?.focus()}
      >
        {label && (
          <Text className={`${labelSizeVal === "xs" ? "text-xs" : "text-sm"} text-text-secondary px-2 pt-1`}>
            {label}
          </Text>
        )}
        <TextInput
          ref={inputRef}
          className="px-2 pb-2 text-base text-text-primary"
          style={{ height: size === "md" ? 28 : 22 }}
          defaultValue={currentValueRef.current}
          onChangeText={(text) => {
            currentValueRef.current = text;
          }}
          onBlur={handleBlur}
          keyboardType={props.type === "number" ? "numeric" : "default"}
          selectTextOnFocus
          testID={props.identifier}
        />
      </Pressable>
    );
  })
);
