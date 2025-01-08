/* eslint-disable @typescript-eslint/no-explicit-any */
import { forwardRef, useState, useCallback, Ref } from "react";
import { UidFactory } from "../utils/generator";
import { StringUtils } from "../utils/string";
import { IEither } from "../utils/types";
import { TextInput, View } from "react-native";
import { LftText } from "./lftText";

export const inputClassName =
  "inline-block w-full px-4 text-base py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline text-base";

export type IValidationError = "required" | "pattern-mismatch";

export interface IProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement> | React.TextareaHTMLAttributes<HTMLTextAreaElement>, "ref"> {
  label?: string;
  identifier?: string;
  multiline?: number;
  changeType?: "onblur" | "oninput";
  defaultValue?: number | string;
  inputSize?: "md" | "sm";
  labelSize?: "xs" | "sm";
  errorMessage?: string;
  patternMessage?: string;
  requiredMessage?: string;
  max?: number | string;
  min?: number | string;
  step?: number | string;
  pattern?: string;
  type?: string;
  autofocus?: boolean;
  changeHandler?: (e: IEither<string, Set<IValidationError>>) => void;
}

export const Input = forwardRef((props: IProps, ref: Ref<TextInput>): JSX.Element => {
  const { inputSize, labelSize, label, changeHandler, errorMessage, patternMessage, ...otherProps } = props;
  const changeType = props.changeType || "onblur";
  const identifier = props.identifier || StringUtils.dashcase((label || UidFactory.generateUid(8))?.toLowerCase());
  const [validationErrors, setValidationErrors] = useState<Set<IValidationError>>(new Set());
  const size = inputSize || "md";

  const onInputHandler = useCallback(
    (value: string) => {
      const errors = new Set<IValidationError>();
      // TODO: Add error handling
      // if (target.validity.patternMismatch) {
      //   errors.add("pattern-mismatch");
      // }
      // if (target.validity.valueMissing) {
      //   errors.add("required");
      // }
      setValidationErrors(errors);
      if (props.changeHandler != null) {
        if (errors.size > 0) {
          props.changeHandler({ success: false, error: errors });
        } else {
          props.changeHandler({ success: true, data: value });
        }
      }
    },
    [changeHandler]
  );

  let className = "relative block w-full text-left border rounded-lg appearance-none ";
  if (props.errorMessage || validationErrors.size > 0) {
    className += " border-redv2-main";
  } else {
    className += " border-grayv2-200";
  }

  const errorMessages = [];
  if (props.errorMessage) {
    errorMessages.push(props.errorMessage);
  }
  for (const error of validationErrors) {
    if (error === "required") {
      errorMessages.push(props.requiredMessage);
    } else if (error === "pattern-mismatch") {
      errorMessages.push(props.patternMessage);
    }
  }

  let containerClassName = "inline-block bg-white rounded-lg";
  if (className.indexOf("w-full") !== -1) {
    containerClassName += " w-full";
  }
  const theLabelSize = labelSize || "sm";
  return (
    <View className={containerClassName}>
      <View data-cy={`${identifier}-label`} className={className} style={{ minHeight: size === "md" ? 48 : 40 }}>
        <View
          className={`relative mx-4 ${size === "md" ? "my-1" : ""}`}
          style={size !== "md" ? { marginTop: 1, marginBottom: 1 } : {}}
        >
          {props.label && (
            <LftText
              className={`relative ${theLabelSize === "xs" ? "text-xs" : "text-sm"} text-grayv2-700`}
              style={{ top: 0, left: 0 }}
            >
              {props.label}
            </LftText>
          )}
          <View className="relative flex" style={{ top: props.label ? 3 : 8, left: 0 }}>
            {props.multiline ? (
              <TextInput
                data-cy={`${identifier}-input`}
                ref={ref as Ref<HTMLTextAreaElement>}
                onBlur={(e) => {
                  if (changeType === "onblur") {
                    onInputHandler(e.nativeEvent.text);
                  }
                }}
                onChange={(e) => {
                  if (changeType === "oninput") {
                    onInputHandler(e.nativeEvent.text);
                  }
                }}
                className="flex-1 w-0 min-w-0 text-base border-none focus:outline-none"
                style={{ fontSize: 16, height: props.multiline * 25 }}
                {...(otherProps as any)}
              />
            ) : (
              <TextInput
                data-cy={`${identifier}-input`}
                ref={ref as Ref<HTMLInputElement>}
                onBlur={(e) => {
                  if (changeType === "onblur") {
                    onInputHandler(e.nativeEvent.text);
                  }
                }}
                onChange={(e) => {
                  if (changeType === "oninput") {
                    onInputHandler(e.nativeEvent.text);
                  }
                }}
                className="flex-1 w-0 min-w-0 text-base border-none focus:outline-none"
                style={{ height: 20, fontSize: 16 }}
                {...(otherProps as any)}
              />
            )}
          </View>
        </View>
      </View>
      {errorMessages.map((message) => (
        <LftText className="text-xs text-left text-redv2-main" key={message}>
          {message}
        </LftText>
      ))}
    </View>
  );
});
