import { JSX, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { SvgUri, SvgXml } from "react-native-svg";
import { BundledImages_svgXml } from "../utils/bundledImages";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { Dialog_alert } from "../utils/dialog";
import {
  History_getPersonalRecords,
  History_totalRecordWeight,
  History_getStartedEntries,
  History_totalRecordReps,
  History_totalRecordSets,
  History_collectMuscleGroups,
  History_workoutTime,
} from "../models/history";
import { Button } from "./button";
import { Weight_display } from "../models/weight";
import { Confetti } from "./confetti";
import { IHistoryRecord, IProgram, IScreenMuscle, ISettings, IStats } from "../types";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_maybeRequestReview, Thunk_maybeRequestSignup, Thunk_pushScreen } from "../ducks/thunks";
import { GroupHeader } from "./groupHeader";
import { HistoryEntryView } from "./historyEntry";
import { Collector } from "../utils/collector";
import { CollectionUtils_splitIntoNGroups } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { TimeUtils_formatHHMM } from "../utils/time";
import {
  SendMessage_isIos,
  SendMessage_iosAppVersion,
  SendMessage_isAndroid,
  SendMessage_androidAppVersion,
} from "../utils/sendMessage";
import { IconInstagram } from "./icons/iconInstagram";
import { WorkoutShareButton } from "./workoutShareButton";
import { IconLink } from "./icons/iconLink";
import { IconKebab } from "./icons/iconKebab";
import { IconPicture } from "./icons/iconPicture";
import { Share_generateLink } from "../models/share";
import { ClipboardUtils_copy } from "../utils/clipboard";
import { InternalLink } from "../internalLink";
import { LinkButton } from "./linkButton";
import { IconTiktok } from "./icons/iconTiktok";
import { PersonalRecords } from "./personalRecords";
import { ImagePreloader_dynohappy } from "../utils/imagePreloader";
import { HostConfig_resolveUrl } from "../utils/hostConfig";
import { n } from "../utils/math";
import { Muscle_getMuscleGroupName } from "../models/muscle";
import { IconDoc } from "./icons/iconDoc";
import { LiftohistorySerializer_serialize } from "../liftohistory/liftohistorySerializer";
import { navigateToModal } from "../navigation/navigationService";

interface IProps {
  history: IHistoryRecord[];
  historyRecordId?: number;
  settings: ISettings;
  userId?: string;
  dispatch: IDispatch;
  stats: IStats;
  allPrograms: IProgram[];
  currentProgramId?: string;
}

export function ScreenFinishDay(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Congratulations!" });

  const recordById =
    props.historyRecordId != null ? props.history.find((h) => h.id === props.historyRecordId) : undefined;
  const record = recordById ?? props.history[0];

  // On the very first workout, history is momentarily empty between the
  // navigate-to-finishDay and the FinishProgramDayAction commit, so `record`
  // is undefined for one render until the committed record arrives.
  if (record == null) {
    return <></>;
  }

  const allPrs = History_getPersonalRecords(props.history);
  const totalWeight = History_totalRecordWeight(record, props.settings.units);

  const startedEntries = History_getStartedEntries(record);
  const totalReps = History_totalRecordReps(record);
  const totalSets = History_totalRecordSets(record);

  const historyCollector = Collector.build([record]).addFn(History_collectMuscleGroups(props.settings));
  const [muscleGroupsData] = historyCollector.run();
  const muscleGroups = ObjectUtils_keys(muscleGroupsData).reduce<[IScreenMuscle, number][]>((memo, mg) => {
    const values = muscleGroupsData[mg];
    if (values[2][0] > 0 && mg !== "total") {
      memo.push([mg, values[2][0]]);
    }
    return memo;
  }, []);
  muscleGroups.sort((a, b) => b[1] - a[1]);
  const muscleGroupsGrouped = CollectionUtils_splitIntoNGroups(muscleGroups, 2);
  const eligibleForCreateProgramDay = props.allPrograms.every((p) => p.id !== record.programId);

  const isMobile =
    Platform.OS === "ios" ||
    Platform.OS === "android" ||
    (SendMessage_isIos() && SendMessage_iosAppVersion() >= 11) ||
    (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 20);

  return (
    <>
      <View className="px-4 pb-6">
        <View className="flex-row items-center justify-center pb-2">
          {Platform.OS === "web" ? (
            <SvgUri uri={HostConfig_resolveUrl(ImagePreloader_dynohappy)} width={170} height={150} />
          ) : (
            <SvgXml xml={BundledImages_svgXml(ImagePreloader_dynohappy) ?? ""} width={170} height={150} />
          )}
        </View>
        <View className="items-center px-4 pb-2">
          <Text className="text-sm text-text-secondary">{record.programName}</Text>
          <Text className="text-base">{record.dayName}</Text>
        </View>
        <View className="px-4 pt-2 pb-3 rounded-lg bg-background-purpledark" testID="totals-summary">
          <GroupHeader name="Totals" />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-sm">
                <Text className="mr-1">🕐</Text> Time:{" "}
                <Text className="font-bold">{TimeUtils_formatHHMM(History_workoutTime(record))} h</Text>
              </Text>
              <Text className="text-sm">
                <Text className="mr-1">🏋</Text> Volume:{" "}
                <Text className="font-bold">{Weight_display(totalWeight)}</Text>
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm">
                <Text className="mr-1">💪</Text> Sets: <Text className="font-bold">{totalSets}</Text>
              </Text>
              <Text className="text-sm">
                <Text className="mr-1">🔄</Text> Reps: <Text className="font-bold">{totalReps}</Text>
              </Text>
            </View>
          </View>
        </View>

        {startedEntries.length > 0 && (
          <View className="px-4 py-2 mt-2 rounded-lg bg-background-purpledark" testID="completed-exercises">
            <GroupHeader name="Exercises" />
            {startedEntries.map((entry, i) => {
              return (
                <HistoryEntryView
                  key={`${entry.exercise.id}_${entry.exercise.equipment}`}
                  showNotes={false}
                  entry={entry}
                  isNext={false}
                  isLast={i === startedEntries.length - 1}
                  settings={props.settings}
                />
              );
            })}
          </View>
        )}

        <View className="px-4 py-2 mt-2 rounded-lg bg-background-purpledark" testID="sets-per-muscle-group">
          <GroupHeader name="Sets per muscle group" />
          <View className="flex-row gap-4">
            {muscleGroupsGrouped.map((group, gi) => {
              return (
                <View key={gi} className="flex-1">
                  {group.map(([mg, value]) => {
                    return (
                      <Text key={mg} className="text-sm">
                        {Muscle_getMuscleGroupName(mg, props.settings)}: <Text className="font-bold">{n(value)}</Text>
                      </Text>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>

        <View className="px-4 py-4 mt-4">
          <PersonalRecords prs={allPrs} historyRecords={[record]} settings={props.settings} />
        </View>

        {isMobile ? (
          <MobileShare userId={props.userId} history={props.history} settings={props.settings} />
        ) : (
          <WebappShare userId={props.userId} history={props.history} settings={props.settings} />
        )}

        {eligibleForCreateProgramDay && (
          <Text className="mx-2 my-1 text-xs text-text-secondary">You can create a program day from this workout</Text>
        )}

        <View className="flex-row w-full gap-4 pt-4">
          {eligibleForCreateProgramDay && (
            <View className="items-center flex-1">
              <Button
                name="create-program-day"
                kind="purple"
                buttonSize="lg2"
                className="w-36"
                testID="create-program-day"
                onPress={() => {
                  navigateToModal("dayFromAdhocModal", { historyRecordId: record.id });
                }}
              >
                Create Program Day
              </Button>
            </View>
          )}
          <View className="items-center justify-center flex-1 pb-8">
            <Button
              name="finish-day-continue"
              kind="purple"
              className="w-36"
              testID="finish-day-continue"
              onPress={() => {
                props.dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
                props.dispatch(Thunk_maybeRequestReview());
                props.dispatch(Thunk_maybeRequestSignup());
              }}
            >
              Continue
            </Button>
          </View>
        </View>
      </View>
      <Confetti />
    </>
  );
}

interface IMobileShareProps {
  history: IHistoryRecord[];
  settings: ISettings;
  userId?: string;
}

function MobileShare(props: IMobileShareProps): JSX.Element {
  return (
    <View className="px-4 py-4">
      <GroupHeader name="Share it!" />
      <View className="flex-row justify-between gap-4">
        <View className="items-center">
          <Pressable
            className="nm-finishday-share-igstory"
            onPress={() => navigateToModal("socialShareModal", { type: "igstory" })}
          >
            <IconInstagram />
          </Pressable>
          <Text className="text-xs text-text-secondary">IG Story</Text>
        </View>
        <View className="items-center">
          <Pressable
            className="nm-finishday-share-igfeed"
            onPress={() => navigateToModal("socialShareModal", { type: "igfeed" })}
          >
            <IconInstagram />
          </Pressable>
          <Text className="text-xs text-text-secondary">IG Feed</Text>
        </View>
        <View className="items-center">
          <Pressable
            className="nm-finishday-share-tiktok"
            onPress={() => navigateToModal("socialShareModal", { type: "tiktok" })}
          >
            <IconTiktok />
          </Pressable>
          <Text className="text-xs text-text-secondary">Tiktok</Text>
        </View>
        <View className="items-center">
          <Pressable
            className="items-center justify-center w-10 h-10 rounded-full nm-finishday-share-text bg-background-subtle"
            onPress={() => {
              const text = LiftohistorySerializer_serialize(props.history[0], props.settings);
              ClipboardUtils_copy(text);
              Dialog_alert("Copied!");
            }}
          >
            <IconDoc />
          </Pressable>
          <Text className="text-xs text-text-secondary">Text</Text>
        </View>
        <View className="items-center">
          <WorkoutShareButton
            history={props.history}
            record={props.history[0]}
            settings={props.settings}
            icon={<IconKebab />}
          />
          <Text className="text-xs text-text-secondary">More</Text>
        </View>
      </View>
      <View className="items-center mt-1">
        <LinkButton
          name="copy-workout-link"
          onPress={() => {
            if (props.userId) {
              const link = Share_generateLink(props.userId, props.history[0].id);
              ClipboardUtils_copy(link);
              Dialog_alert("Copied!");
            } else {
              Dialog_alert("You should be logged in to copy link to a workout");
            }
          }}
        >
          or just copy a link
        </LinkButton>
      </View>
    </View>
  );
}

interface IWebappShareProps {
  history: IHistoryRecord[];
  userId?: string;
  settings: ISettings;
}

function WebappShare(props: IWebappShareProps): JSX.Element {
  const [copiedLink, setCopiedLink] = useState<string | undefined>(undefined);
  const userId = props.userId;

  return (
    <View className="px-4 py-4">
      <GroupHeader name="Share it!" />
      <View className="flex-row justify-between gap-4">
        <View className="items-center">
          <WorkoutShareButton
            history={props.history}
            record={props.history[0]}
            settings={props.settings}
            icon={<IconPicture />}
          />
          <Text className="text-xs text-text-secondary">Image</Text>
        </View>
        <View className="items-center">
          <Pressable
            testID="finishday-share-text"
            className="items-center justify-center w-10 h-10 rounded-full bg-background-subtle"
            onPress={() => {
              const text = LiftohistorySerializer_serialize(props.history[0], props.settings);
              ClipboardUtils_copy(text);
              Dialog_alert("Copied!");
            }}
          >
            <IconDoc />
          </Pressable>
          <Text className="text-xs text-text-secondary">Text</Text>
        </View>
        <View className="items-center">
          <Pressable
            className="items-center justify-center w-10 h-10 rounded-full bg-background-subtle"
            onPress={() => {
              if (userId) {
                const link = Share_generateLink(userId, props.history[0].id);
                ClipboardUtils_copy(link);
                setCopiedLink(link);
              } else {
                Dialog_alert("You should be logged in to copy link to a workout");
              }
            }}
          >
            <IconLink />
          </Pressable>
          {copiedLink ? (
            <View className="flex-row">
              <Text className="text-xs text-text-secondary">Copied: </Text>
              <InternalLink name="shared-workout-link" href={copiedLink} className="font-bold underline text-text-link">
                Link
              </InternalLink>
            </View>
          ) : (
            <Text className="text-xs text-text-secondary">Copy Link</Text>
          )}
        </View>
      </View>
    </View>
  );
}
