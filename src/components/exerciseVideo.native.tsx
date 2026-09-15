import { JSX } from "react";
import Video from "react-native-video";
import { StyleProp, ViewStyle } from "react-native";

interface IExerciseVideoProps {
  uri: string;
  poster?: string;
  resizeMode?: "contain" | "cover";
  style?: StyleProp<ViewStyle>;
  onError?: () => void;
}

export function ExerciseVideo(props: IExerciseVideoProps): JSX.Element {
  return (
    <Video
      source={{ uri: props.uri }}
      poster={props.poster ? { source: { uri: props.poster }, resizeMode: props.resizeMode ?? "contain" } : undefined}
      repeat
      muted
      resizeMode={props.resizeMode ?? "contain"}
      ignoreSilentSwitch="ignore"
      style={props.style}
      onError={() => props.onError?.()}
    />
  );
}
