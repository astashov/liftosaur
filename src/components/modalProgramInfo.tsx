import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { IProgram, ISettings } from "../types";
import { Link } from "./link";
import { IconWatch } from "./icons/iconWatch";
import { TimeUtils_formatHHMM } from "../utils/time";
import { Program_evaluate, Program_dayAverageTimeMs } from "../models/program";
import { SimpleMarkdown } from "./simpleMarkdown";

interface IProps {
  program: IProgram;
  hasCustomPrograms: boolean;
  settings: ISettings;
  onSelect: () => void;
  onPreview: () => void;
  onClose: () => void;
}

export function ModalProgramInfoContent(props: IProps): JSX.Element {
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  const time = Program_dayAverageTimeMs(evaluatedProgram, props.settings);
  const formattedTime = time > 0 ? TimeUtils_formatHHMM(time) : undefined;
  return (
    <View className="pt-4">
      <Text className="pr-6 text-lg font-bold">
        {props.hasCustomPrograms ? "Clone" : "Start"} <Link href={props.program.url}>{props.program.name}</Link>
      </Text>
      <Text className="text-sm text-text-secondary">by {props.program.author}</Text>
      {formattedTime && (
        <View className="flex-row items-center pb-1">
          <View className="pr-1">
            <IconWatch />
          </View>
          <Text className="flex-1 text-sm" style={{ paddingTop: 2 }}>
            Average time of a workout: <Text className="font-bold">{formattedTime}</Text>
          </Text>
        </View>
      )}
      <SimpleMarkdown value={props.program.description} className="mt-4 text-sm" />
      <View className="flex-row justify-center gap-3 mt-6">
        <Button name="preview-program" data-cy="preview-program" kind="grayv2" onClick={props.onPreview}>
          Preview
        </Button>
        <Button name="clone-program" kind="purple" data-cy="clone-program" onClick={props.onSelect}>
          {props.hasCustomPrograms ? "Clone" : "Start"}
        </Button>
      </View>
    </View>
  );
}
