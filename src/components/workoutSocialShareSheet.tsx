import { JSX, h } from "preact";
import { IHistoryRecord, ISettings } from "../types";
import { Button } from "./button";
import { useEffect, useRef, useState } from "preact/hooks";
import { IRect } from "../utils/types";
import { Geometry } from "../utils/geometry";
import { WorkoutShareOutput } from "./workoutShareOutput";
import { IconCamera } from "./icons/iconCamera";
import { SendMessage } from "../utils/sendMessage";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IconPicture } from "./icons/iconPicture";
import { IconSpinner } from "./icons/iconSpinner";
import { WorkoutShareOutputWithBg } from "./workoutShareOutputWithBg";
import { ImageShareUtils } from "../utils/imageshare";
import { LinkButton } from "./linkButton";

interface IWorkoutShareSheetProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  type: "igstory" | "igfeed" | "tiktok";
  isHidden?: boolean;
}

export function WorkoutSocialShareSheet(props: IWorkoutShareSheetProps): JSX.Element {
  const screensRef = useRef<HTMLDivElement>();
  const workoutShareRef = useRef<HTMLDivElement>();
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [showPickerOptions, setShowPickerOptions] = useState<boolean>(false);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const title =
    props.type === "igstory"
      ? "Share workout to IG Story"
      : props.type === "igfeed"
      ? "Share workout to IG Feed"
      : "Share workout to Tiktok";
  return (
    <section
      data-cy="workout-share-sheet"
      className="relative flex flex-col overflow-hidden text-blackv2"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      <h2 className="my-4 text-base font-bold text-center">{title}</h2>
      <div className="flex-1">
        <div
          ref={screensRef}
          className="flex items-stretch h-full gap-8 overflow-x-scroll overflow-y-hidden"
          style={{
            padding: "0 18.75vw",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
          }}
          onScroll={() => {
            const scrollLeft = screensRef.current?.scrollLeft ?? 0;
            const windowWidth = window.innerWidth;
            const selectedFrame = Math.floor((scrollLeft + windowWidth / 2) / windowWidth);
            if (selectedFrameIndex !== selectedFrame) {
              setSelectedFrameIndex(selectedFrame);
            }
          }}
        >
          <div
            className="flex flex-col"
            style={{ minWidth: "62.5vw", scrollSnapAlign: "center", scrollSnapStop: "always" }}
          >
            <div className="relative flex items-center flex-1">
              {!props.isHidden && (
                <WorkoutShareImage
                  type={props.type}
                  history={props.history}
                  record={props.record}
                  settings={props.settings}
                />
              )}
            </div>
            <h2 className="px-4 pt-2 pb-4 text-base text-center">Default Background</h2>
          </div>
          <div
            className="flex flex-col"
            style={{ minWidth: "62.5vw", scrollSnapAlign: "center", scrollSnapStop: "always" }}
          >
            <div className="relative flex items-center flex-1">
              {!props.isHidden && (
                <WorkoutShareImage
                  type={props.type}
                  record={props.record}
                  history={props.history}
                  settings={props.settings}
                  isCustomBg={true}
                  backgroundImage={backgroundImage}
                  onPickCustomBg={() => {
                    setShowPickerOptions(true);
                  }}
                />
              )}
            </div>
            <h2 className="pt-2 pb-4 text-base text-center">
              <LinkButton
                name="your-photo-bg"
                onClick={() => {
                  setShowPickerOptions(true);
                }}
              >
                Your photo as background
              </LinkButton>
            </h2>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center pb-4 text-center">
        <div className="safe-area-inset-bottom">
          <div className="mt-2">
            <Button
              name="share-workout"
              kind="orange"
              disabled={isLoading}
              className="w-32"
              onClick={async () => {
                setIsLoading(true);
                try {
                  const dataUrl = await ImageShareUtils.generateImageDataUrl(workoutShareRef.current);
                  setIsLoading(false);
                  SendMessage.toIosAndAndroid({
                    type: "share",
                    target: props.type,
                    useCustomBackground: selectedFrameIndex === 1 ? "true" : "false",
                    backgroundImage: selectedFrameIndex === 1 ? backgroundImage : undefined,
                    workoutImage: dataUrl,
                  });
                } catch (error) {
                  setIsLoading(false);
                  console.error(error);
                  alert("Unknown error happened. Couldn't share the workout");
                }
              }}
            >
              {isLoading ? <IconSpinner color="white" width={16} height={16} /> : "Share"}
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute" style={{ top: "9999px", left: "9999px" }}>
        <div ref={workoutShareRef} style={{ width: "420px" }}>
          {props.type === "igstory" ? (
            <WorkoutShareOutput history={props.history} record={props.record} settings={props.settings} />
          ) : props.type === "igfeed" || props.type === "tiktok" ? (
            <WorkoutShareOutputWithBg
              history={props.history}
              type={props.type}
              record={props.record}
              settings={props.settings}
              backgroundImage={
                selectedFrameIndex === 1
                  ? backgroundImage
                  : props.type === "igfeed"
                  ? "/images/workoutsharesquarebg.jpg"
                  : "/images/workoutsharebg.jpg"
              }
            />
          ) : null}
        </div>
      </div>
      <BottomSheet isHidden={!showPickerOptions} onClose={() => setShowPickerOptions(false)}>
        <div className="p-4">
          <BottomSheetItem
            title="From Camera"
            name="from-camera"
            icon={<IconCamera size={24} color="black" />}
            isFirst={true}
            description="Take a photo"
            onClick={async () => {
              const result = await SendMessage.toIosAndAndroidWithResult<{ data: string }>({
                type: "pickphoto",
                source: "camera",
              });
              setBackgroundImage(result?.data);
              setShowPickerOptions(false);
            }}
          />
          <BottomSheetItem
            title="From Photo Library"
            name="from-photo-library"
            icon={<IconPicture size={24} color="black" />}
            description="Pick photo from your photo library"
            onClick={async () => {
              const result = await SendMessage.toIosAndAndroidWithResult<{ data: string }>({
                type: "pickphoto",
                source: "photo-library",
              });
              setBackgroundImage(result?.data);
              setShowPickerOptions(false);
            }}
          />
        </div>
      </BottomSheet>
    </section>
  );
}

interface IWorkoutShareImageProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  type: "igstory" | "igfeed" | "tiktok";
  settings: ISettings;
  isCustomBg?: boolean;
  backgroundImage?: string;
  onPickCustomBg?: () => void;
}

function WorkoutShareImage(props: IWorkoutShareImageProps): JSX.Element {
  const [rect, setRect] = useState<IRect>({ x: 0, y: 0, width: 0, height: 0 });
  const mainRef = useRef<HTMLDivElement>();
  const workoutRef = useRef<HTMLDivElement>();
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const backgroundImage = props.backgroundImage;

  useEffect(() => {
    const handleResize = (): void => {
      const parent = mainRef.current?.parentElement;
      if (parent) {
        const parentRect = { x: 0, y: 0, width: parent.clientWidth, height: parent.clientHeight };
        const newRect = Geometry.fitRectIntoRect(
          { x: 0, y: 0, width: 90, height: props.type === "igfeed" ? 90 : 160 },
          parentRect
        );
        const newRatio = newRect.width / 420;
        const workoutHeight = (workoutRef.current?.clientHeight || 0) * newRatio;
        const newMultiplier = Math.min(1.0, (newRect.height * 0.9) / workoutHeight);
        setMultiplier(newMultiplier);
        setRect(newRect);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const width = 420;
  const ratio = (rect.width / width) * multiplier;
  return (
    <div
      ref={mainRef}
      className="absolute bg-gray-300"
      onClick={props.onPickCustomBg}
      style={{
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        backgroundColor: "#5F5F5F",
        backgroundImage: props.isCustomBg
          ? backgroundImage
            ? `url(${backgroundImage})`
            : undefined
          : props.type === "igfeed"
          ? `url("/images/workoutsharesquarebg.jpg")`
          : `url("/images/workoutsharebg.jpg")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {props.isCustomBg && !backgroundImage && (
        <div className="absolute" style={{ top: `15%`, left: "50%", transform: "translate(-50%, -50%)" }}>
          <IconCamera size={51} color="white" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 w-full">
        <div
          style={{
            width,
            transform: `scale(${ratio})`,
            transformOrigin: "bottom left",
          }}
        >
          <div ref={workoutRef}>
            <WorkoutShareOutput record={props.record} history={props.history} settings={props.settings} />
          </div>
        </div>
      </div>
    </div>
  );
}
