import { useTranslation } from "../i18n/context";
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
  const translate = useTranslation();
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  const time = Program_dayAverageTimeMs(evaluatedProgram, props.settings);
  const formattedTime = time > 0 ? TimeUtils_formatHHMM(time) : undefined;
  return (
    <>
      <View>
        <Text className="pr-6 text-lg font-bold">
          {props.hasCustomPrograms ? translate("Clone") : translate("Start")}{" "}
          <Link className="text-lg" href={props.program.url}>
            {props.program.name}
          </Link>
        </Text>
      </View>
      <View>
        <Text className="text-sm text-text-secondary">
          {translate("by")} {props.program.author}
        </Text>
      </View>
      {formattedTime && (
        <View className="flex-row items-center pb-1">
          <View className="pr-1">
            <IconWatch />
          </View>
          <Text className="flex-1 text-sm" style={{ paddingTop: 2 }}>
            {translate("Average time of a workout:")} <Text className="text-sm font-bold">{formattedTime}</Text>
          </Text>
        </View>
      )}
      <SimpleMarkdown value={props.program.description} className="mt-4 text-sm" />
      <View className="flex-row justify-center gap-3 mt-4 mb-2">
        <Button
          name="preview-program"
          data-testid="preview-program"
          testID="preview-program"
          kind="grayv2"
          onClick={props.onPreview}
        >
          {translate("Preview")}
        </Button>
        <Button
          name="clone-program"
          kind="purple"
          data-testid="clone-program"
          testID="clone-program"
          onClick={props.onSelect}
        >
          {props.hasCustomPrograms ? translate("Clone") : translate("Start")}
        </Button>
      </View>
    </>
  );
}
