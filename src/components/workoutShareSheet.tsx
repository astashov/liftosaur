import { JSX, h } from "preact";
import { IHistoryRecord, ISettings } from "../types";
import { Button } from "./button";
import { useEffect, useRef, useState } from "preact/hooks";
import { IRect } from "../utils/types";
import { Geometry } from "../utils/geometry";
import { WorkoutShareOutput } from "./workoutShareOutput";

interface IWorkoutShareSheetProps {
  record: IHistoryRecord;
  settings: ISettings;
  isHidden?: boolean;
}

export function WorkoutShareSheet(props: IWorkoutShareSheetProps): JSX.Element {
  const screensRef = useRef<HTMLDivElement>();
  return (
    <section
      data-cy="workout-share-sheet"
      className="flex flex-col text-blackv2"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      <h2 className="my-4 text-base font-bold text-center">Share workout to IG Story</h2>
      <div className="flex-1">
        <div
          ref={screensRef}
          onScroll={() => {
            const scrollLeft = screensRef.current?.scrollLeft ?? 0;
            const windowWidth = window.innerWidth;
            console.log(scrollLeft, windowWidth);
          }}
          className="flex items-stretch h-full gap-8 overflow-x-scroll overflow-y-hidden"
          style={{
            padding: "0 18.75vw",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
          }}
        >
          <div
            className="flex flex-col"
            style={{ minWidth: "62.5vw", scrollSnapAlign: "center", scrollSnapStop: "always" }}
          >
            <div className="relative flex items-center flex-1">
              {!props.isHidden && <WorkoutShareImage record={props.record} settings={props.settings} />}
            </div>
            <h2 className="px-4 pt-2 pb-4 text-base text-center">Default Background</h2>
          </div>
          <div
            className="flex flex-col"
            style={{ minWidth: "62.5vw", scrollSnapAlign: "center", scrollSnapStop: "always" }}
          >
            <div className="relative flex items-center flex-1">
              {!props.isHidden && <WorkoutShareImage record={props.record} settings={props.settings} />}
            </div>
            <h2 className="px-4 pt-2 pb-4 text-base text-center">Your photo as background</h2>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center pb-4 text-center">
        <div className="safe-area-inset-bottom">
          <div className="mt-2">
            <Button name="share-workout-to-ig-story" kind="orange">
              Share
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

interface IWorkoutShareImageProps {
  record: IHistoryRecord;
  settings: ISettings;
  backgroundImage?: string;
}

function WorkoutShareImage(props: IWorkoutShareImageProps): JSX.Element {
  const [rect, setRect] = useState<IRect>({ x: 0, y: 0, width: 0, height: 0 });
  const mainRef = useRef<HTMLDivElement>();

  useEffect(() => {
    const handleResize = (): void => {
      const parent = mainRef.current?.parentElement;
      if (parent) {
        const parentRect = { x: 0, y: 0, width: parent.clientWidth, height: parent.clientHeight };
        setRect(Geometry.fitRectIntoRect({ x: 0, y: 0, width: 90, height: 160 }, parentRect));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const width = 420;
  const ratio = rect.width / width;
  return (
    <div
      ref={mainRef}
      className="absolute bg-gray-300"
      style={{
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        backgroundImage: props.backgroundImage ? `url(${props.backgroundImage})` : `url("/images/workoutsharebg.jpg")`,
        backgroundSize: "cover",
      }}
    >
      <div className="absolute bottom-0 left-0 w-full">
        <div style={{ width, transform: `scale(${ratio})`, transformOrigin: "bottom left" }}>
          <WorkoutShareOutput rect={rect} record={props.record} settings={props.settings} />
        </div>
      </div>
    </div>
  );
}
