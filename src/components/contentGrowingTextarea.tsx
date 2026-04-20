import { JSX, useEffect, useState } from "react";
import { TextInput } from "react-native";

interface IContentGrowingTextareaProps {
  value: string;
  onInput?: (value: string) => void;
  className?: string;
}

export function ContentGrowingTextarea({ value, onInput, className = "" }: IContentGrowingTextareaProps): JSX.Element {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <TextInput
      value={localValue}
      multiline
      scrollEnabled={false}
      onChangeText={(text) => {
        setLocalValue(text);
        onInput?.(text);
      }}
      onBlur={() => {
        if (localValue.trim() === "") {
          setLocalValue(value);
        } else {
          const stripped = localValue.replace(/[\r\n]+/g, " ").trim();
          if (stripped !== localValue) {
            setLocalValue(stripped);
            onInput?.(stripped);
          }
        }
      }}
      textAlignVertical="top"
      style={{ padding: 0, margin: 0 }}
      className={`underline ${className}`}
    />
  );
}
