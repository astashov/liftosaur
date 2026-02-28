import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { IExerciseType, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";
import { Exercise_targetMusclesGroups, Exercise_synergistMusclesGroups } from "../models/exercise";
import { Muscle_getMuscleGroupName } from "../models/muscle";

export function ExerciseTooltip(props: {
  exerciseType: IExerciseType;
  settings: ISettings;
  name: string;
}): JSX.Element {
  const [show, setShow] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [nudge, setNudge] = useState(0);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: Event): void {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPinned(false);
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("touchstart", handleOutsideClick, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
      document.removeEventListener("touchstart", handleOutsideClick, true);
    };
  }, []);

  useEffect(() => {
    if (!show || !tooltipRef.current) {
      setNudge(0);
      return;
    }
    const rect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const padding = 8;
    if (rect.left < padding) {
      setNudge(padding - rect.left);
    } else if (rect.right > viewportWidth - padding) {
      setNudge(viewportWidth - padding - rect.right);
    } else {
      setNudge(0);
    }
  }, [show]);

  const targetMuscles = Exercise_targetMusclesGroups(props.exerciseType, props.settings);
  const synergistMuscles = Exercise_synergistMusclesGroups(props.exerciseType, props.settings);

  return (
    <span
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        if (!pinned) {
          setShow(true);
        }
      }}
      onMouseLeave={() => {
        if (!pinned) {
          setShow(false);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (pinned) {
          setPinned(false);
          setShow(false);
        } else {
          setPinned(true);
          setShow(true);
        }
      }}
    >
      <strong className="cursor-pointer md-exercise-name" style={{ borderBottom: "1px dashed #999" }}>
        {props.name}
      </strong>
      {show && (
        <div
          ref={tooltipRef}
          className="absolute z-20 px-3 py-2 text-xs bg-white border rounded-lg shadow-lg md-exercise-tooltip border-grayv2-400"
          style={{
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: `translateX(calc(-50% + ${nudge}px))`,
            minWidth: "14rem",
            maxWidth: "22rem",
          }}
        >
          <div className="flex items-start gap-2 mb-1">
            <div className="w-12">
              <ExerciseImage
                settings={props.settings}
                className="inline-block w-12"
                exerciseType={props.exerciseType}
                size="small"
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{props.name}</div>
              {targetMuscles.length > 0 && (
                <div>
                  <span className="font-semibold text-text-secondary">Target: </span>
                  <span className="font-normal">
                    {targetMuscles.map((m) => Muscle_getMuscleGroupName(m, props.settings)).join(", ")}
                  </span>
                </div>
              )}
              {synergistMuscles.length > 0 && (
                <div>
                  <span className="font-semibold text-text-secondary">Synergist: </span>
                  <span className="font-normal">
                    {synergistMuscles.map((m) => Muscle_getMuscleGroupName(m, props.settings)).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "-5px",
              left: `calc(50% - ${nudge}px)`,
              transform: "translateX(-50%) rotate(45deg)",
              width: "10px",
              height: "10px",
              background: "white",
              borderRight: "1px solid #d1d5db",
              borderBottom: "1px solid #d1d5db",
            }}
          />
        </div>
      )}
    </span>
  );
}
