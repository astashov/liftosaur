import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { Reps } from "../models/set";
import { IExerciseType, ISettings, ISet } from "../types";
import { useCallback, useRef } from "preact/hooks";
import { n } from "../utils/math";

interface IProps {
  exercise: IExerciseType;
  showHelp?: boolean;
  isCurrent: boolean;
  settings: ISettings;
  set: ISet;
  isEditMode: boolean;
  size?: "small" | "medium";
  onLongPress?: () => void;
  onClick: (e: Event) => void;
}

export const ExerciseSetView = memo(
  (props: IProps): JSX.Element => {
    const set = props.set;
    const subtitle = `${n(set.weight.value)}${set.completedReps == null && set.askWeight ? "+" : ""}`;

    let cy: string;
    let color: "red" | "green" | "gray" | "yellow";
    let title;
    let rightSuperstring;
    let leftSuperstring: string | undefined;
    let leftSuperstringColor: "orange" | "gray" | undefined;
    let shinyBorder;
    if (set.isAmrap) {
      title = set.completedReps == null ? Reps.displayReps(set) : set.completedReps;
      rightSuperstring = set.completedReps != null ? `${set.reps}+` : undefined;
      if (set.completedReps == null) {
        cy = "set-amrap-nonstarted";
        color = "gray";
      } else if (set.minReps != null && set.completedReps < set.minReps) {
        cy = "set-amrap-incompleted";
        color = "red";
      } else if (set.minReps != null && set.completedReps < set.reps) {
        cy = "set-amrap-in-range";
        color = "yellow";
      } else if (set.completedReps < set.reps) {
        cy = "set-amrap-incompleted";
        color = "red";
      } else {
        cy = "set-amrap-completed";
        color = "green";
      }
    } else if (set.completedReps == null) {
      title = Reps.displayReps(set);
      cy = "set-nonstarted";
      color = "gray";
      shinyBorder = true;
    } else {
      title = Reps.displayCompletedReps(set);
      if (set.completedReps >= set.reps) {
        cy = "set-completed";
        color = "green";
      } else if (set.minReps != null && set.completedReps >= set.minReps) {
        cy = "set-in-range";
        color = "yellow";
      } else {
        cy = "set-incompleted";
        color = "red";
      }
    }

    if (set.rpe != null || set.completedRpe != null) {
      leftSuperstring = set.completedRpe != null ? `@${set.completedRpe}` : `@${set.rpe}`;
      leftSuperstringColor = set.completedRpe != null ? "orange" : "gray";
    } else if (set.logRpe) {
      leftSuperstring = "@?";
      leftSuperstringColor = "gray";
    }

    return (
      <ExerciseSetBase
        cy={cy}
        showHelp={props.showHelp}
        onClick={props.onClick}
        title={title}
        subtitle={subtitle}
        leftSuperstring={leftSuperstring}
        leftSuperstringColor={leftSuperstringColor}
        rightSuperstring={rightSuperstring}
        shinyBorder={shinyBorder}
        size={props.size}
        onLongPress={props.onLongPress}
        color={color}
      />
    );
  }
);

interface IExerciseSetBaseProps {
  cy: string;
  showHelp?: boolean;
  title: string | number;
  subtitle: string | number;
  leftSuperstring?: string;
  leftSuperstringColor?: "gray" | "orange";
  rightSuperstring?: string;
  color: "gray" | "red" | "green" | "yellow";
  shinyBorder?: boolean;
  size?: "small" | "medium";
  onClick: (e: Event) => void;
  onLongPress?: () => void;
}

function ExerciseSetBase(props: IExerciseSetBaseProps): JSX.Element {
  const size = props.size || "medium";
  const sizeClassNames = size === "small" ? "w-10 h-10 text-xs" : "w-12 h-12";
  let className = `ls-progress ${sizeClassNames} relative leading-7 text-center border rounded-lg`;
  if (props.color === "green") {
    className += ` bg-greenv2-300 border-greenv2-400`;
  } else if (props.color === "red") {
    className += ` bg-redv2-300 border-redv2-400`;
  } else if (props.color === "yellow") {
    className += ` bg-orange-200 border-orange-400`;
  } else {
    className += ` bg-grayv2-50 border-grayv2-200`;
  }

  const { onUp, onMove, onDown, onClick } = useLongPress(1000, props.onLongPress, props.onClick);

  const button = (
    <button
      key={props.cy}
      data-help-id={props.showHelp ? "progress-set" : undefined}
      data-help={`Press here to record completed ${props.title} reps, press again to lower completed reps.`}
      data-help-width={200}
      data-cy={props.cy}
      onTouchStart={onDown}
      onTouchMove={onMove}
      onTouchEnd={onUp}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      className={`${className} nm-${props.cy}`}
      onClick={onClick}
      style={{ userSelect: "none", touchAction: "manipulation" }}
    >
      {props.rightSuperstring != null && (
        <div
          data-cy="reps-completed-amrap"
          style={{ top: "-9px", right: "-5px", fontSize: "10px" }}
          className="absolute p-1 text-xs leading-none text-right text-white rounded-full bg-purplev2-600 border-purplev2-800"
        >
          {props.rightSuperstring}
        </div>
      )}
      {props.leftSuperstring != null && (
        <div
          data-cy={props.leftSuperstringColor === "orange" ? "left-superscript-completed" : "left-superscript"}
          style={{ top: "-9px", left: "-4px", fontSize: "10px" }}
          className={`absolute p-1 text-xs leading-none text-right text-white rounded-full ${
            props.leftSuperstringColor === "orange" ? "bg-orangev2" : "bg-grayv2-main"
          }`}
        >
          {props.leftSuperstring}
        </div>
      )}
      <div className="font-bold leading-none" data-cy="reps-value">
        {props.title}
      </div>
      <div style={{ paddingTop: "2px" }} data-cy="weight-value" className="text-xs leading-none text-grayv2-600">
        {props.subtitle}
      </div>
    </button>
  );
  return props.shinyBorder && props.showHelp ? <div className="shiny-border">{button}</div> : button;
}

function useLongPress(
  ms: number,
  onLongPress?: () => void,
  onClick?: (e: Event) => void
): {
  onDown?: (e: MouseEvent | TouchEvent) => void;
  onMove?: (e: MouseEvent | TouchEvent) => void;
  onUp?: (e: MouseEvent | TouchEvent) => void;
  onClick?: (e: Event) => void;
} {
  if (onLongPress == null) {
    return { onDown: undefined, onUp: undefined, onClick };
  }
  const startPos = useRef<{ x: number; y: number; time: number } | undefined>(undefined);
  const currentPos = useRef<{ x: number; y: number } | undefined>(undefined);
  const wasLongPress = useRef<boolean>(false);
  const timerRef = useRef<number | undefined>();

  const onDown = useCallback(
    (e: MouseEvent | TouchEvent) => {
      document.body.classList.add("no-select");
      wasLongPress.current = false;
      if (timerRef.current != null) {
        return;
      }
      const pos =
        e instanceof MouseEvent
          ? { x: e.clientX, y: e.clientY, time: Date.now() }
          : { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
      startPos.current = pos;
      currentPos.current = pos;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined;
        if (startPos.current != null && currentPos.current != null) {
          const { x, y } = currentPos.current;
          const dx = x - startPos.current.x;
          const dy = y - startPos.current.y;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            onLongPress();
            wasLongPress.current = true;
          }
        }
      }, ms);
    },
    [onLongPress]
  );

  const onMove = useCallback((e: MouseEvent | TouchEvent) => {
    const pos =
      e instanceof MouseEvent ? { x: e.clientX, y: e.clientY } : { x: e.touches[0].clientX, y: e.touches[0].clientY };
    currentPos.current = pos;
  }, []);

  const onUp = useCallback(
    (e: MouseEvent | TouchEvent) => {
      setTimeout(() => {
        document.body.classList.remove("no-select");
      }, 200);
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    },
    [timerRef.current]
  );
  const wrappedOnClick = onClick
    ? useCallback(
        (e: Event) => {
          if (!wasLongPress.current) {
            onClick(e);
          }
          wasLongPress.current = false;
        },
        [onClick, wasLongPress.current]
      )
    : undefined;

  return { onUp, onMove, onDown, onClick: wrappedOnClick };
}
