import { JSX, h, ComponentChildren, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { IconSpinner } from "./icons/iconSpinner";
import { IExerciseType, ISettings } from "../types";
import { IconDefaultExercise } from "./icons/iconDefaultExercise";
import { ExerciseImageUtils } from "../models/exerciseImage";
import { Exercise } from "../models/exercise";

interface IProps {
  exerciseType: IExerciseType;
  size: "large" | "small";
  suppressCustom?: boolean;
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

  const imgRef = useRef<HTMLImageElement>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  useEffect(() => {
    if (imgRef.current) {
      if (imgRef.current.complete) {
        setIsLoading(false);
      } else {
        imgRef.current.addEventListener("load", () => {
          setIsLoading(false);
        });
        imgRef.current.addEventListener("error", () => {
          setIsError(true);
        });
      }
    }
  }, []);
  let className = `inline ${props.className} `;
  if (isLoading || isError) {
    className += "invisible h-0";
  }
  const src = ExerciseImageUtils.url(exerciseType, size, props.settings);
  const doesExist =
    ExerciseImageUtils.exists(exerciseType, size) ||
    (!props.suppressCustom && ExerciseImageUtils.existsCustom(exerciseType, size, props.settings));

  if (size === "small") {
    return (
      <>
        {!isError && doesExist && <img data-cy="exercise-image-small" ref={imgRef} className={className} src={src} />}
        {isError ||
          (!doesExist && (
            <div className={`h-0 inline-block ${props.className}`}>
              <div
                className="relative inline-block w-full h-full overflow-hidden align-middle"
                style={{ paddingBottom: "100%" }}
              >
                <IconDefaultExercise className={`absolute top-0 left-0 w-full h-full`} />
              </div>
            </div>
          ))}
      </>
    );
  } else {
    return doesExist ? (
      <>
        <img ref={imgRef} data-cy="exercise-image-large" className={className} src={src} />
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
        <span class="text-red-700">Error fetching the exercise image</span>
      </ExerciseNoImage>
    );
  } else if (props.isLoading) {
    return (
      <ExerciseNoImage size={props.size}>
        <div className="w-full text-center">
          <IconSpinner width={20} height={20} />
        </div>
      </ExerciseNoImage>
    );
  } else {
    return null;
  }
}

interface INoImageProps {
  children: ComponentChildren;
  size: "large" | "small";
}

function ExerciseNoImage(props: INoImageProps): JSX.Element | null {
  return (
    <div className="px-4 py-10 my-4 text-xs leading-normal text-center bg-gray-200 border border-gray-400 border-dotted rounded-lg">
      {props.children}
    </div>
  );
}
