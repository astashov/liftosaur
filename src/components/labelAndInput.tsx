import { TextInput, View, TextInputProps } from "react-native";
import { inputClassName } from "./input";
import { LftText } from "./lftText";

interface ILabelAndInputProps extends TextInputProps {
  identifier: string;
  star?: boolean;
  label: string;
  errorMessage?: string;
  hint?: string;
}

export const LabelAndInput = (props: ILabelAndInputProps): JSX.Element => {
  const { identifier, label, errorMessage, hint } = props;
  const id = [props.id, identifier].filter((r) => r).join(" ");
  return (
    <View className="mb-4">
      <LftText data-cy={`${identifier}-label`} className="block text-sm font-bold">
        {label}
        {props.star && <LftText className="text-redv2-main"> *</LftText>}
      </LftText>
      <TextInput data-cy={`${identifier}-input`} id={id} className={inputClassName} {...props} />
      {hint && <LftText className="text-xs text-grayv2-main">{hint}</LftText>}
      {errorMessage && <LftText className="text-xs text-red-500">{errorMessage}</LftText>}
    </View>
  );
};
