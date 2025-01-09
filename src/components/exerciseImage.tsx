import React, { JSX } from "react";
import { useRef, useState } from "react";
import { View, Image } from "react-native";
import { IconSpinner } from "./icons/iconSpinner";
import { IExerciseType, ISettings } from "../types";
import { IconDefaultExercise } from "./icons/iconDefaultExercise";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { Exercise } from "../models/exercise";
import { LftText } from "./lftText";
import { UrlUtils } from "../utils/url";

declare let __HOST__: string;

interface IProps {
  exerciseType: IExerciseType;
  size: "large" | "small";
  settings?: ISettings;
  className?: string;
}

export function ExerciseImage(props: IProps): JSX.Element | null {
  const { size } = props;
  const exercise = Exercise.get(props.exerciseType, props.settings?.exercises || {});
  const exerciseType = {
    id: props.exerciseType.id,
    equipment: props.exerciseType.equipment || exercise.defaultEquipment,
  };

  const imgRef = useRef<Image>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  let className = `inline ${props.className} `;
  if (isLoading || isError) {
    className += "invisible h-0";
  }
  const src = ExerciseImageUtils.url(exerciseType, size, props.settings);
  const fullSrc = src ? UrlUtils.build(src, __HOST__) : undefined;
  console.log(fullSrc);
  const doesExist =
    ExerciseImageUtils.exists(exerciseType, size) ||
    ExerciseImageUtils.existsCustom(exerciseType, size, props.settings);

  console.log("Classname", isLoading, isError, className);
  if (size === "small") {
    return (
      <>
        {!isError && doesExist && (
          <Image
            data-cy="exercise-image-small"
            ref={imgRef}
            className={props.className}
            source={fullSrc ? { uri: fullSrc.toString() } : undefined}
          />
        )}
        {isError ||
          (!doesExist && (
            <View className={`h-0 inline-block ${props.className}`}>
              <View
                className="relative inline-block w-full h-full overflow-hidden align-middle"
                style={{ paddingBottom: "100%" }}
              >
                <IconDefaultExercise className={`absolute top-0 left-0 w-full h-full`} />
              </View>
            </View>
          ))}
      </>
    );
  } else {
    return doesExist ? (
      <>
        <Image
          data-cy="exercise-image-large"
          className={className}
          source={fullSrc ? { uri: fullSrc.toString() } : undefined}
        />
        <ExerciseImageAuxiliary size={props.size} isError={isError} isLoading={isLoading} />
      </>
    ) : (
      <ExerciseNoImage size={props.size}>No exercise image</ExerciseNoImage>
    );
  }
}

function ExerciseImageAuxiliary(props: {
  size: "large" | "small";
  isError: boolean;
  isLoading: boolean;
}): JSX.Element | null {
  if (props.isError) {
    return (
      <ExerciseNoImage size={props.size}>
        <LftText className="text-red-700">Error fetching the exercise image</LftText>
      </ExerciseNoImage>
    );
  } else if (props.isLoading) {
    return (
      <ExerciseNoImage size={props.size}>
        <View className="w-full text-center">
          <IconSpinner width={20} height={20} />
        </View>
      </ExerciseNoImage>
    );
  } else {
    return null;
  }
}

interface INoImageProps {
  children: React.ReactNode;
  size: "large" | "small";
}

function ExerciseNoImage(props: INoImageProps): JSX.Element | null {
  return (
    <View className="px-4 py-10 my-4 text-xs leading-normal text-center bg-gray-200 border border-gray-400 border-dotted rounded-lg">
      {props.children}
    </View>
  );
}
