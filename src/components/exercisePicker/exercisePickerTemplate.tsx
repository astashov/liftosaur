import { JSX, memo, useState } from "react";
import { View, TextInput } from "react-native";
import { Text } from "../primitives/text";
import { IExercisePickerState } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  templateName?: string;
  dispatch: ILensDispatch<IExercisePickerState>;
}

export const ExercisePickerTemplate = memo(function ExercisePickerTemplate(props: IProps): JSX.Element {
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  return (
    <View className="mx-4 mt-4 mb-4">
      <View className="mb-4">
        <Text className="text-sm font-bold">
          Template Name<Text className="text-text-error"> *</Text>
        </Text>
        <TextInput
          data-testid="exercise-template-name"
          testID="exercise-template-name"
          defaultValue={props.templateName ?? ""}
          placeholder="My Awesome Template"
          placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
          className="px-4 py-2 mt-1 text-base leading-5 border rounded-lg min-h-10 bg-background-default border-border-prominent text-text-primary"
          onChangeText={(rawValue) => {
            const value = rawValue?.trim() || "";
            if (!value) {
              setNameError("Name cannot be empty");
            } else if (/[/{}()\t\n\r#\[\]]+/.test(value)) {
              setNameError("Name cannot contain special characters: '/{}()#[]'");
            } else {
              setNameError(undefined);
              props.dispatch(
                lb<IExercisePickerState>().p("templateName").record(value),
                `Set template name to ${value}`
              );
            }
          }}
        />
        {nameError && <Text className="mt-1 text-xs text-text-error">{nameError}</Text>}
      </View>
      <Text className="my-2 text-sm">
        <Text className="text-sm">You can choose any name for the template, and it will be saved as </Text>
        <Text className="text-sm font-bold">"non-used"</Text>
        <Text className="text-sm"> (i.e. as a template). You can reuse </Text>
        <Text className="text-sm font-bold">sets</Text>
        <Text className="text-sm">, </Text>
        <Text className="text-sm font-bold">warmup</Text>
        <Text className="text-sm">, </Text>
        <Text className="text-sm font-bold">update</Text>
        <Text className="text-sm"> or </Text>
        <Text className="text-sm font-bold">progress</Text>
        <Text className="text-sm"> from this template in your real exercises.</Text>
      </Text>
    </View>
  );
});
