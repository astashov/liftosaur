import { useState } from "react";
import type { JSX } from "preact";
import { View, Text, Image } from "react-native";
import { IconSpinner } from "./icons/IconSpinner";
import { IconDefaultExercise } from "./icons/IconDefaultExercise";
import type { IExerciseType, ISettings } from "@shared/types";
import {
  ExerciseImageUtils_url,
  ExerciseImageUtils_exists,
  ExerciseImageUtils_existsCustom,
} from "@shared/models/exerciseImage";
import { Exercise_get, Exercise_nameWithEquipment } from "@shared/models/exercise";

const IMAGE_BASE = "https://www.liftosaur.com";

interface IProps {
  exerciseType: IExerciseType;
  size: "large" | "small";
  useTextForCustomExercise?: boolean;
  suppressCustom?: boolean;
  settings?: ISettings;
  className?: string;
  width?: number;
}

export function ExerciseImage(props: IProps): JSX.Element | null {
  const { size } = props;
  const exercise = Exercise_get(props.exerciseType, props.settings?.exercises || {});
  const exerciseType = {
    id: props.exerciseType.id,
    equipment: props.exerciseType.equipment || exercise.defaultEquipment,
  };

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const src = ExerciseImageUtils_url(exerciseType, size, props.settings);
  const doesExist =
    ExerciseImageUtils_exists(exerciseType, size) ||
    ExerciseImageUtils_existsCustom(exerciseType, size, !!props.suppressCustom, props.settings);

  if (!doesExist) {
    if (size === "small" && props.useTextForCustomExercise) {
      return (
        <View className={props.className} style={{ paddingBottom: "100%", position: "relative" }}>
          <View className="absolute inset-0 items-center justify-start bg-background-image" style={{ padding: 4 }}>
            <Text className="text-xs text-text-secondarysubtle" numberOfLines={2}>
              {Exercise_nameWithEquipment(exercise, props.settings)}
            </Text>
          </View>
        </View>
      );
    }
    if (size === "small") {
      return (
        <View className={props.className}>
          <IconDefaultExercise className="w-full h-full" />
        </View>
      );
    }
    return (
      <View className="px-4 py-10 my-4 text-xs text-center border border-dotted rounded-lg border-border-neutral bg-background-neutral">
        <Text>No exercise image</Text>
      </View>
    );
  }

  const uri = `${IMAGE_BASE}${src}`;
  const imgWidth = props.width || 32;
  const imgHeight = Math.round(imgWidth * 1.5);

  return (
    <View className={props.className} data-cy={size === "small" ? "exercise-image-small" : "exercise-image-large"}>
      {!isError && (
        <Image
          source={{ uri }}
          style={{ width: imgWidth, height: imgHeight }}
          resizeMode="contain"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsError(true)}
        />
      )}
      {isLoading && !isError && (
        <View
          className="items-center justify-center"
          style={{ width: imgWidth, height: imgHeight, position: "absolute" }}
        >
          <IconSpinner width={16} height={16} />
        </View>
      )}
      {isError && (
        <View className="items-center justify-center" style={{ width: imgWidth, height: imgHeight }}>
          <IconDefaultExercise size={imgWidth} />
        </View>
      )}
    </View>
  );
}
