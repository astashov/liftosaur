import type { JSX } from "react";
import { TextInput } from "react-native";

interface IProps {
  value: string;
  onChange?: (newValue: string) => void;
}

export function MarkdownEditor(props: IProps): JSX.Element {
  return (
    <TextInput
      multiline
      defaultValue={props.value}
      onChangeText={(text) => props.onChange?.(text)}
      className="p-2 text-sm border rounded-lg bg-background-default border-border-prominent text-text-primary"
      style={{ minHeight: 120, textAlignVertical: "top" }}
    />
  );
}
