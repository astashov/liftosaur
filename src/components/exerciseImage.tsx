import { JSX, h, ComponentChildren, Fragment } from "preact";
import { IExerciseType, Exercise } from "../models/exercise";
import { useEffect, useRef, useState } from "preact/hooks";
import { IconSpinner } from "./iconSpinner";

interface IProps {
  exerciseType: IExerciseType;
}

export function ExerciseImage({ exerciseType }: IProps): JSX.Element | null {
  const targetMuscles = Exercise.targetMuscles(exerciseType);
  const imgRef = useRef<HTMLImageElement>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  useEffect(() => {
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
  }, []);
  let className = "inline";
  if (isLoading || isError) {
    className = "invisible h-0";
  }
  return targetMuscles.length > 0 ? (
    <Fragment>
      <img
        ref={imgRef}
        className={className}
        src={`https://www.liftosaur.com/externalimages/exercises/full/large/${exerciseType.id.toLowerCase()}_${(
          exerciseType.equipment || "bodyweight"
        ).toLowerCase()}_full_large.png`}
      />
      <ExerciseImageAuxiliary isError={isError} isLoading={isLoading} />
    </Fragment>
  ) : (
    <ExerciseNoImage>No exercise image</ExerciseNoImage>
  );
}

function ExerciseImageAuxiliary(props: { isError: boolean; isLoading: boolean }): JSX.Element | null {
  if (props.isError) {
    return (
      <ExerciseNoImage>
        <span class="text-red-700">Error fetching the exercise image</span>
      </ExerciseNoImage>
    );
  } else if (props.isLoading) {
    return (
      <ExerciseNoImage>
        <IconSpinner width={20} height={20} />
      </ExerciseNoImage>
    );
  } else {
    return null;
  }
}

interface INoImageProps {
  children: ComponentChildren;
}

function ExerciseNoImage(props: INoImageProps): JSX.Element {
  return (
    <div className="p-10 text-xs text-center bg-gray-200 border border-gray-400 border-dotted rounded-lg">
      {props.children}
    </div>
  );
}
