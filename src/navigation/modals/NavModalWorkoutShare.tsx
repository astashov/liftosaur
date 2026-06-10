import { JSX, useEffect } from "react";
import { View, Platform } from "react-native";
import { Dialog_alert } from "../../utils/dialog";
import { useRoute, useNavigation, StackActions } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { BottomSheetItem } from "../../components/bottomSheetItem";
import { WorkoutShareBottomSheetItem } from "../../components/workoutShareBottomSheetItem";
import { IconInstagram } from "../../components/icons/iconInstagram";
import { IconTiktok } from "../../components/icons/iconTiktok";
import { IconLink } from "../../components/icons/iconLink";
import { IconDoc } from "../../components/icons/iconDoc";
import { IconHeart } from "../../components/icons/iconHeart";
import { ClipboardUtils_copy } from "../../utils/clipboard";
import { Share_generateLink } from "../../models/share";
import { History_calories, History_pauseWorkout } from "../../models/history";
import { Thunk_saveWorkoutToHealth } from "../../ducks/thunks";
import { LiftohistorySerializer_serialize } from "../../liftohistory/liftohistorySerializer";
import {
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
} from "../../utils/sendMessage";
import { NativeWorkoutBridge_finishWorkout } from "../../utils/nativeWorkoutBridge";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../../lib/healthSync";
import type { IRootStackParamList } from "../types";

export function NavModalWorkoutShare(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "workoutShareModal";
    params: IRootStackParamList["workoutShareModal"];
  }>();
  const { progressId } = route.params;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const isMobile =
    Platform.OS === "ios" ||
    Platform.OS === "android" ||
    (SendMessage_isIos() && SendMessage_iosAppVersion() >= 11) ||
    (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 20);

  const replaceWithSocialShare = (type: "igstory" | "igfeed" | "tiktok"): void => {
    navigation.dispatch(StackActions.replace("socialShareModal", { type, progressId }));
  };

  const shouldGoBack = !progress;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !progress) {
    return <></>;
  }

  const onClose = (): void => {
    navigation.goBack();
  };

  const isIos = Platform.OS === "ios" || SendMessage_isIos();
  const healthName = isIos ? "Apple Health" : "Google Health";
  const shouldShowHealthSync = HealthSync_eligibleForAppleHealth() || HealthSync_eligibleForGoogleHealth();

  const content = (
    <View className="pb-4">
      {isMobile && (
        <>
          <BottomSheetItem
            name="share-to-igstory"
            title="Share to Instagram Story"
            isFirst={true}
            description={""}
            icon={<IconInstagram size={24} />}
            onClick={() => replaceWithSocialShare("igstory")}
          />
          <BottomSheetItem
            name="share-to-igfeed"
            title="Share to Instagram Feed"
            description={""}
            icon={<IconInstagram size={24} />}
            onClick={() => replaceWithSocialShare("igfeed")}
          />
          <BottomSheetItem
            name="share-to-tiktok"
            title="Share to Tiktok"
            description={""}
            icon={<IconTiktok width={24} height={24} />}
            onClick={() => replaceWithSocialShare("tiktok")}
          />
          {shouldShowHealthSync && (
            <BottomSheetItem
              name="submit-to-health"
              title={`Sync to ${healthName}`}
              description={""}
              icon={<IconHeart size={24} />}
              onClick={() => {
                // Legacy webview wrapper builds (Platform.OS === "web") sync via the native
                // finishWorkout bridge message; bare-RN builds write directly through env.health.
                if (SendMessage_isIos() || SendMessage_isAndroid()) {
                  NativeWorkoutBridge_finishWorkout({
                    healthSync: true,
                    calories: History_calories(progress),
                    intervals: JSON.stringify(progress.intervals),
                  });
                } else {
                  const rawIntervals = History_pauseWorkout(progress.intervals) ?? [];
                  const intervals: [number, number | null][] = rawIntervals.map(([s, e]) => [s, e ?? null]);
                  const validIntervals = intervals.filter((i): i is [number, number] => i[1] != null);
                  const startMs = validIntervals[0]?.[0] ?? progress.startTime;
                  const endMs = validIntervals[validIntervals.length - 1]?.[1] ?? progress.endTime ?? startMs;
                  dispatch(
                    Thunk_saveWorkoutToHealth({
                      startMs,
                      endMs,
                      calories: History_calories(progress),
                      intervals,
                    })
                  );
                }
                onClose();
              }}
            />
          )}
        </>
      )}
      <BottomSheetItem
        name="share-to-link"
        title="Copy link to workout"
        isFirst={!isMobile}
        description={""}
        icon={<IconLink />}
        onClick={() => {
          if (state.user?.id) {
            const link = Share_generateLink(state.user.id, progress.id);
            ClipboardUtils_copy(link);
            Dialog_alert("Copied!");
          } else {
            Dialog_alert("You should be logged in to copy link to a workout");
          }
        }}
      />
      <WorkoutShareBottomSheetItem
        history={state.storage.history}
        record={progress}
        settings={state.storage.settings}
      />
      <BottomSheetItem
        name="share-to-text"
        title="Copy as Text"
        description={""}
        icon={<IconDoc width={24} height={24} />}
        onClick={() => {
          const text = LiftohistorySerializer_serialize(progress, state.storage.settings);
          ClipboardUtils_copy(text);
          Dialog_alert("Copied!");
          onClose();
        }}
      />
    </View>
  );

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true} fitContent={true}>
      <FormSheet>{content}</FormSheet>
    </SheetScreenContainer>
  );
}
