import { h, JSX } from "preact";
import { useRef, useState, useEffect } from "preact/hooks";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Button } from "./button";
import { IconArrowRight } from "./icons/iconArrowRight";
import { IPhoneFrame } from "./iphoneFrame";

interface IProps {
  dispatch: IDispatch;
}

export function ScreenOnboarding(props: IProps): JSX.Element {
  const screens = [
    {
      title: "1. You choose a pre-built weightlifting program, or create your own.",
      content: "/images/onboarding-1-choose-program.mp4",
    },
    {
      title: "2. Then, start the workout, and tap on a square each time you finish a set.",
      content: "/images/onboarding-2-record-sets.mp4",
    },
    {
      title: "3. When you finish the exercise, it automatically will change next reps or weight.",
      content: "/images/onboarding-3-update-vars.mp4",
    },
    {
      title: "4. You can change or edit the program",
      content: "/images/onboarding-4-edit-exercise2.mp4",
    },
    {
      title: "5. Ensure you have right weekly/daily volume per muscle group.",
      content: "/images/onboarding-5-liftoscript2.mp4",
    },
  ];

  const [selectedDotIndex, setSelectedDotIndex] = useState(0);
  const selectedDotRef = useRef<number>(selectedDotIndex);
  const screensRef = useRef<HTMLDivElement>();
  const video = [
    useRef<HTMLVideoElement>(),
    useRef<HTMLVideoElement>(),
    useRef<HTMLVideoElement>(),
    useRef<HTMLVideoElement>(),
    useRef<HTMLVideoElement>(),
  ];

  useEffect(() => {
    // eslint-disable-next-line no-unused-expressions
    video[0].current?.play();
  }, []);

  return (
    <section className="flex flex-col h-screen text-blackv2">
      <div className="flex-1">
        <div
          ref={screensRef}
          onScroll={() => {
            const scrollLeft = screensRef.current?.scrollLeft ?? 0;
            const windowWidth = window.innerWidth;
            const selectedDot = Math.floor((scrollLeft + windowWidth / 2) / windowWidth);
            if (selectedDotRef.current !== selectedDot) {
              selectedDotRef.current = selectedDot;
              setSelectedDotIndex(selectedDot);
              // eslint-disable-next-line no-unused-expressions
              video[selectedDot]?.current?.play();
            }
          }}
          className="flex h-full overflow-x-scroll overflow-y-hidden shadow-lg"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
            boxShadow: "0 2px 8px 0px rgb(0 0 0 / 10%)",
          }}
        >
          {screens.map((screen, i) => (
            <div
              className="flex flex-col h-full"
              style={{ minWidth: "100vw", scrollSnapAlign: "center", scrollSnapStop: "always" }}
            >
              <h2
                className="flex items-center px-8 pt-8 pb-4 text-xl font-bold text-center"
                style={{ minHeight: "8.5rem" }}
              >
                {screen.title}
              </h2>
              <div className="relative flex justify-center flex-1">
                <div className="absolute" style={{ top: 0, left: "auto", width: "300px", height: "600px" }}>
                  <video
                    ref={video[i]}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ width: "95%", height: "94%", top: "15px", left: "5px" }}
                    playsInline
                    muted
                    loop
                    src={screen.content}
                  ></video>
                  <IPhoneFrame width="100%" height="100%" className="absolute top-0 left-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center pt-4 pb-3">
        {screens.map((_, i) => (
          <div className={`w-2 h-2 mx-1 rounded-full ${i === selectedDotIndex ? "bg-blackv2" : "bg-grayv2-main"}`} />
        ))}
      </div>
      <div className="flex items-center justify-center pb-4 text-center">
        <div
          style={{ visibility: selectedDotIndex === screens.length - 1 ? "visible" : "hidden" }}
          className="safe-area-inset-bottom"
        >
          <Button
            name="onboarding-choose-a-program"
            onClick={() => props.dispatch(Thunk.pushScreen("units"))}
            kind="purple"
          >
            <span className="align-middle">Continue</span>{" "}
            <IconArrowRight className="inline ml-2 align-middle left-right-animation" color="white" />
          </Button>
        </div>
      </div>
    </section>
  );
}
