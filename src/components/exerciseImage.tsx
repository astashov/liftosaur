import { JSX, h, ComponentChildren, Fragment } from "preact";
import { Exercise } from "../models/exercise";
import { useEffect, useRef, useState } from "preact/hooks";
import { IconSpinner } from "./icons/iconSpinner";
import { IAllCustomExercises, IExerciseType } from "../types";

interface IProps {
  exerciseType: IExerciseType;
  customExercises: IAllCustomExercises;
  size: "large" | "small";
  className?: string;
}

export function ExerciseImage(props: IProps): JSX.Element | null {
  const { exerciseType, customExercises, size } = props;
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
  let className = `inline ${props.className}`;
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
      {props.size === "large" && <ExerciseImageAuxiliary size={props.size} isError={isError} isLoading={isLoading} />}
    </Fragment>
  ) : (
    <ExerciseNoImage size={props.size}>No exercise image</ExerciseNoImage>
  );
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
  if (props.size === "small") {
    return null;
  }
  return (
    <div className="px-4 py-10 text-xs leading-normal text-center bg-gray-200 border border-gray-400 border-dotted rounded-lg">
      {props.children}
    </div>
  );
}
