import { JSX, ReactNode, useState } from "react";
import { View, Image } from "react-native";
import { Text } from "./primitives/text";
import { IconSpinner } from "./icons/iconSpinner";
import { IExerciseType, ISettings } from "../types";
import { IconDefaultExercise } from "./icons/iconDefaultExercise";
import {
  ExerciseImageUtils_url,
  ExerciseImageUtils_exists,
  ExerciseImageUtils_existsCustom,
} from "../models/exerciseImage";
import { Exercise_get, Exercise_nameWithEquipment } from "../models/exercise";
import { HostConfig_resolveUrl } from "../utils/hostConfig";
import { ImageCache_initialUri, ImageCache_markMissing, ImageCache_download } from "../utils/imageCache";

interface IProps {
  exerciseType: IExerciseType;
  size: "large" | "small";
  useTextForCustomExercise?: boolean;
  useBorderForCustomExercise?: boolean;
  suppressCustom?: boolean;
  settings?: ISettings;
  className?: string;
  customClassName?: string;
  width?: number;
}

export function ExerciseImage(props: IProps): JSX.Element | null {
  const { size } = props;
  const exercise = Exercise_get(props.exerciseType, props.settings?.exercises || {});
  const exerciseType = {
    id: props.exerciseType.id,
    equipment: props.exerciseType.equipment || exercise.defaultEquipment,
  };

  const rawSrc = ExerciseImageUtils_url(exerciseType, size, props.settings);
  const remoteSrc = rawSrc ? HostConfig_resolveUrl(rawSrc) : undefined;
  const initialUri = remoteSrc ? ImageCache_initialUri(remoteSrc) : undefined;

  const [prevRemote, setPrevRemote] = useState<string | undefined>(remoteSrc);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const [src, setSrc] = useState<string | undefined>(initialUri);
  const [usingRemote, setUsingRemote] = useState<boolean>(initialUri === remoteSrc);

  if (prevRemote !== remoteSrc) {
    setPrevRemote(remoteSrc);
    setSrc(initialUri);
    setUsingRemote(initialUri === remoteSrc);
    setIsLoading(true);
    setIsError(false);
    setAspectRatio(4 / 3);
  }

  const doesExist =
    ExerciseImageUtils_exists(exerciseType, size) ||
    ExerciseImageUtils_existsCustom(exerciseType, size, !!props.suppressCustom, props.settings);

  const onCachedError = (): void => {
    if (!usingRemote && remoteSrc) {
      ImageCache_markMissing(remoteSrc);
      setUsingRemote(true);
      setSrc(remoteSrc);
    } else {
      setIsError(true);
    }
  };

  const onCachedLoad = (): void => {
    setIsLoading(false);
    if (usingRemote && remoteSrc) {
      ImageCache_download(remoteSrc);
    }
  };

  if (size === "small") {
    const w = props.width || 32;
    const imgStyle = { width: w, height: Math.round(w * 1.5) };
    return (
      <>
        {!isError && doesExist && (
          <Image
            data-testid="exercise-image-small"
            testID="exercise-image-small"
            className={props.className}
            source={{ uri: src }}
            style={imgStyle}
            onLoad={onCachedLoad}
            onError={onCachedError}
            accessibilityLabel={Exercise_nameWithEquipment(exercise, props.settings)}
          />
        )}
        {(isError || !doesExist) &&
          (props.useTextForCustomExercise ? (
            <View
              className={`items-start justify-center overflow-hidden bg-background-image ${props.className ?? ""} ${props.customClassName ?? ""}`}
              style={{ aspectRatio: 1 }}
            >
              <Text className="text-xs text-text-secondarysubtle" style={{ fontSize: 11, lineHeight: 13 }}>
                {Exercise_nameWithEquipment(exercise, props.settings)}
              </Text>
            </View>
          ) : (
            <View className={props.className}>
              <IconDefaultExercise size={props.width || 32} />
            </View>
          ))}
      </>
    );
  } else {
    return doesExist ? (
      <>
        <Image
          data-testid="exercise-image-large"
          testID="exercise-image-large"
          className={props.className}
          source={{ uri: src }}
          resizeMode="contain"
          style={{ width: "100%", aspectRatio }}
          onLoad={(e) => {
            onCachedLoad();
            const source = (e?.nativeEvent as { source?: { width?: number; height?: number } } | undefined)?.source;
            if (source?.width && source?.height) {
              setAspectRatio(source.width / source.height);
            }
          }}
          onError={onCachedError}
          accessibilityLabel={Exercise_nameWithEquipment(exercise, props.settings)}
        />
        <ExerciseImageAuxiliary size={props.size} isError={isError} isLoading={isLoading} />
      </>
    ) : (
      <ExerciseNoImage size={props.size}>
        <Text>No exercise image</Text>
      </ExerciseNoImage>
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
        <Text className="text-xs leading-normal text-center text-red-700">Error fetching the exercise image</Text>
      </ExerciseNoImage>
    );
  } else if (props.isLoading) {
    return (
      <ExerciseNoImage size={props.size}>
        <View className="items-center w-full">
          <IconSpinner width={20} height={20} />
        </View>
      </ExerciseNoImage>
    );
  } else {
    return null;
  }
}

interface INoImageProps {
  children: ReactNode;
  size: "large" | "small";
}

function ExerciseNoImage(props: INoImageProps): JSX.Element | null {
  return (
    <View className="items-center justify-center px-4 py-10 my-4 border border-dotted rounded-lg border-border-neutral bg-background-neutral">
      {props.children}
    </View>
  );
}
