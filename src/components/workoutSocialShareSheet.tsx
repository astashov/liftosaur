import { JSX, useRef, useState } from "react";
import { View, ScrollView, Pressable, Image, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { IHistoryRecord, ISettings } from "../types";
import { Button } from "./button";
import { Dialog_alert } from "../utils/dialog";
import { WorkoutShareOutput } from "./workoutShareOutput";
import { IconCamera } from "./icons/iconCamera";
import { IconSpinner } from "./icons/iconSpinner";
import { WorkoutShareOutputWithBg } from "./workoutShareOutputWithBg";
import { ImageShareUtils } from "../utils/imageshare";
import { LinkButton } from "./linkButton";
import { useModal } from "../navigation/ModalStateContext";
import { Geometry_fitRectIntoRect } from "../utils/geometry";
import { IRect } from "../utils/types";
import { HostConfig_resolveUrl } from "../utils/hostConfig";

interface IWorkoutShareSheetProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  type: "igstory" | "igfeed" | "tiktok";
  isHidden?: boolean;
}

export function WorkoutSocialShareSheet(props: IWorkoutShareSheetProps): JSX.Element {
  const workoutShareRef = useRef<View>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const window = Dimensions.get("window");
  const frameWidth = window.width * 0.625;
  const sidePadding = window.width * 0.1875;
  const insets = useSafeAreaInsets();

  const openPhotoPicker = useModal("photoPickerModal", (result) => {
    if (result) {
      setBackgroundImage(result);
    }
  });
  const title =
    props.type === "igstory"
      ? "Share workout to IG Story"
      : props.type === "igfeed"
        ? "Share workout to IG Feed"
        : "Share workout to Tiktok";

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const scrollLeft = e.nativeEvent.contentOffset.x;
    const selectedFrame = Math.floor((scrollLeft + window.width / 2) / window.width);
    if (selectedFrameIndex !== selectedFrame) {
      setSelectedFrameIndex(selectedFrame);
    }
  };

  return (
    <View
      data-testid="workout-share-sheet"
      testID="workout-share-sheet"
      className="relative flex-col flex-1 overflow-hidden"
    >
      <Text className="my-4 text-base font-bold text-center">{title}</Text>
      <View className="flex-1">
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          snapToInterval={window.width}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: sidePadding, gap: 32, alignItems: "stretch" }}
        >
          <View className="flex-col" style={{ minWidth: frameWidth }}>
            <View className="relative flex-row items-center flex-1">
              {!props.isHidden && (
                <WorkoutShareImage
                  type={props.type}
                  history={props.history}
                  record={props.record}
                  settings={props.settings}
                />
              )}
            </View>
            <Text className="px-4 pt-2 pb-4 text-base text-center">Default Background</Text>
          </View>
          <View className="flex-col" style={{ minWidth: frameWidth }}>
            <View className="relative flex-row items-center flex-1">
              {!props.isHidden && (
                <WorkoutShareImage
                  type={props.type}
                  record={props.record}
                  history={props.history}
                  settings={props.settings}
                  isCustomBg={true}
                  backgroundImage={backgroundImage}
                  onPickCustomBg={() => {
                    openPhotoPicker({});
                  }}
                />
              )}
            </View>
            <Text className="pt-2 pb-4 text-base text-center">
              <LinkButton
                name="your-photo-bg"
                onClick={() => {
                  openPhotoPicker({});
                }}
              >
                Your photo as background
              </LinkButton>
            </Text>
          </View>
        </ScrollView>
      </View>
      <View className="flex-row items-center justify-center pb-4" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="mt-2">
          <Button
            name="share-workout"
            kind="purple"
            disabled={isLoading}
            className="w-32"
            onClick={async () => {
              setIsLoading(true);
              try {
                const dataUrl = await ImageShareUtils.generateImageDataUrl(workoutShareRef.current!);
                setIsLoading(false);
                await ImageShareUtils.shareToSocial(props.type, dataUrl, {
                  backgroundImage: selectedFrameIndex === 1 ? backgroundImage : undefined,
                });
              } catch (error) {
                setIsLoading(false);
                console.error(error);
                Dialog_alert("Unknown error happened. Couldn't share the workout");
              }
            }}
          >
            {isLoading ? <IconSpinner color="white" width={16} height={16} /> : "Share"}
          </Button>
        </View>
      </View>
      <View collapsable={false} className="absolute" style={{ left: -9999, top: -9999 }}>
        <View ref={workoutShareRef} collapsable={false} style={{ width: 420 }}>
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
                    ? HostConfig_resolveUrl("/images/workoutsharesquarebg.jpg")
                    : HostConfig_resolveUrl("/images/workoutsharebg.jpg")
              }
            />
          ) : null}
        </View>
      </View>
    </View>
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
  const [parentSize, setParentSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [workoutHeight, setWorkoutHeight] = useState<number>(0);

  const rect: IRect =
    parentSize.width > 0 && parentSize.height > 0
      ? Geometry_fitRectIntoRect(
          { x: 0, y: 0, width: 90, height: props.type === "igfeed" ? 90 : 160 },
          { x: 0, y: 0, width: parentSize.width, height: parentSize.height }
        )
      : { x: 0, y: 0, width: 0, height: 0 };

  const width = 420;
  const newRatio = rect.width / width;
  const multiplier = workoutHeight > 0 ? Math.min(1.0, (rect.height * 0.9) / (workoutHeight * newRatio)) : 1;
  const ratio = newRatio * multiplier;

  const isFeed = props.type === "igfeed";
  const defaultBgUri = HostConfig_resolveUrl(
    isFeed ? "/images/workoutsharesquarebg.jpg" : "/images/workoutsharebg.jpg"
  );
  const effectiveBgUri = props.isCustomBg ? props.backgroundImage : defaultBgUri;

  return (
    <View
      className="absolute top-0 left-0 right-0 bottom-0"
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if ((w !== parentSize.width || h !== parentSize.height) && w > 0 && h > 0) {
          setParentSize({ width: w, height: h });
        }
      }}
    >
      <Pressable
        onPress={props.onPickCustomBg}
        className="absolute bg-gray-500"
        style={{ width: rect.width, height: rect.height, left: rect.x, top: rect.y }}
      >
        {effectiveBgUri ? (
          <Image
            source={{ uri: effectiveBgUri }}
            className="absolute top-0 left-0 right-0 bottom-0"
            resizeMode="cover"
          />
        ) : null}
        {props.isCustomBg && !props.backgroundImage && (
          <View className="absolute items-center" style={{ top: "15%", left: "50%", marginLeft: -25 }}>
            <IconCamera size={51} color="white" />
          </View>
        )}
        <View className="absolute bottom-0 left-0 w-full">
          <View
            style={{
              width,
              transform: [{ scale: ratio }],
              transformOrigin: "bottom left",
            }}
          >
            <View
              collapsable={false}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h > 0 && Math.abs(h - workoutHeight) > 0.5) {
                  setWorkoutHeight(h);
                }
              }}
            >
              <WorkoutShareOutput record={props.record} history={props.history} settings={props.settings} />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
