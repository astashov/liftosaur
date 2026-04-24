import { JSX, Ref, forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import { TextInput, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IEither } from "../utils/types";

export function InputAccessoryDone(): null {
  return null;
}

export const inputClassName = "";

export type IValidationError = "required" | "pattern-mismatch";

export interface IInputHandle {
  touch: () => void;
}

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
  handleRef?: Ref<IInputHandle>;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
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
    const [validationErrors, setValidationErrors] = useState<Set<IValidationError>>(new Set());
    const [touched, setTouched] = useState(false);

    useImperativeHandle(props.handleRef, () => ({
      touch: () => {
        setTouched(true);
        runValidation({ applyClamp: false, displayMode: "snapshot" });
      },
    }));

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

    const changeType = props.changeType || "onblur";

    const runValidation = (opts: { applyClamp: boolean; displayMode: "clear-only" | "snapshot" }): void => {
      const trimmed = currentValueRef.current.trim();
      const errors = new Set<IValidationError>();
      if (trimmed === "" && props.required) {
        errors.add("required");
      }
      let result = trimmed;
      if (trimmed !== "" && props.type === "number") {
        const num = parseFloat(trimmed);
        if (isNaN(num)) {
          errors.add("pattern-mismatch");
        } else if (opts.applyClamp) {
          let clamped = num;
          if (min != null) {
            clamped = Math.max(min, clamped);
          }
          if (max != null) {
            clamped = Math.min(max, clamped);
          }
          result = String(clamped);
          if (currentValueRef.current !== result) {
            currentValueRef.current = result;
            inputRef.current?.setNativeProps({ text: result });
          }
        }
      }
      if (opts.displayMode === "snapshot") {
        setValidationErrors(errors);
      } else {
        setValidationErrors((prev) => {
          const next = new Set<IValidationError>();
          for (const err of prev) {
            if (errors.has(err)) {
              next.add(err);
            }
          }
          return next;
        });
      }
      if (!changeHandler) {
        return;
      }
      if (errors.size > 0) {
        changeHandler({ success: false, error: errors });
      } else {
        changeHandler({ success: true, data: result });
      }
    };

    const errorMessages: string[] = [];
    if (props.errorMessage) {
      errorMessages.push(props.errorMessage);
    }
    if (touched) {
      for (const error of validationErrors) {
        if (error === "required" && props.requiredMessage) {
          errorMessages.push(props.requiredMessage);
        } else if (error === "pattern-mismatch" && props.patternMessage) {
          errorMessages.push(props.patternMessage);
        }
      }
    }
    const hasError = !!props.errorMessage || (touched && validationErrors.size > 0);

    return (
      <View>
        <Pressable
          className={`border rounded-lg bg-background-default ${
            hasError ? "border-text-error" : "border-border-neutral"
          }`}
          onPress={() => inputRef.current?.focus()}
        >
          {label && (
            <Text className={`${labelSizeVal === "xs" ? "text-xs" : "text-sm"} text-text-secondary px-2 pt-1`}>
              {label}
            </Text>
          )}
          <TextInput
            ref={inputRef}
            className="px-2 pb-2 text-base leading-5 text-text-primary"
            style={{ height: size === "md" ? 28 : 22 }}
            defaultValue={currentValueRef.current}
            placeholder={props.placeholder}
            autoCapitalize={props.autoCapitalize}
            autoCorrect={props.autoCorrect}
            onChangeText={(text) => {
              currentValueRef.current = text;
              if (changeType === "oninput") {
                runValidation({ applyClamp: false, displayMode: "clear-only" });
              }
            }}
            onBlur={() => {
              setTouched(true);
              runValidation({ applyClamp: true, displayMode: "snapshot" });
            }}
            keyboardType={props.type === "number" ? "numeric" : "default"}
            selectTextOnFocus
            testID={props.identifier}
          />
        </Pressable>
        {errorMessages.map((message) => (
          <Text className="text-xs text-text-error" key={message}>
            {message}
          </Text>
        ))}
      </View>
    );
  })
);
