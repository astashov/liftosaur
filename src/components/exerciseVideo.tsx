import { CSSProperties, JSX } from "react";

interface IExerciseVideoProps {
  uri: string;
  poster?: string;
  resizeMode?: "contain" | "cover";
  className?: string;
  style?: CSSProperties;
  onLoad?: (size: { width: number; height: number }) => void;
  onError?: () => void;
}

export function ExerciseVideo(props: IExerciseVideoProps): JSX.Element {
  return (
    <video
      className={props.className}
      style={{ ...props.style, objectFit: props.resizeMode === "cover" ? "cover" : "contain" }}
      src={props.uri}
      poster={props.poster}
      autoPlay
      muted
      loop
      playsInline
      onLoadedMetadata={(e) =>
        props.onLoad?.({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
      }
      onError={() => props.onError?.()}
    />
  );
}
