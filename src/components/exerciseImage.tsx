import { JSX, h, ComponentChildren, Fragment } from "preact";
import { Exercise } from "../models/exercise";
import { useEffect, useRef, useState } from "preact/hooks";
import { IconSpinner } from "./iconSpinner";
import { IAllCustomExercises, IExerciseType } from "../types";

interface IProps {
  exerciseType: IExerciseType;
  customExercises: IAllCustomExercises;
  size: "large" | "small";
}

export function ExerciseImage({ exerciseType, customExercises, size }: IProps): JSX.Element | null {
  const targetMuscles = Exercise.targetMuscles(exerciseType, customExercises);
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
  let className = "inline";
  if (isLoading || isError) {
    className = "invisible h-0";
  }
  const id = exerciseType.id.toLowerCase();
  const equipment = (exerciseType.equipment || "bodyweight").toLowerCase();
  const src =
    size === "large"
      ? `https://www.liftosaur.com/externalimages/exercises/full/large/${id}_${equipment}_full_large.png`
      : `https://www.liftosaur.com/externalimages/exercises/single/small/${id}_${equipment}_single_small.png`;
  return targetMuscles.length > 0 ? (
    <Fragment>
      <img ref={imgRef} className={className} src={src} />
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
}

function ExerciseNoImage(props: INoImageProps): JSX.Element {
  return (
    <div className="px-4 py-10 text-xs leading-normal text-center bg-gray-200 border border-gray-400 border-dotted rounded-lg">
      {props.children}
    </div>
  );
}
