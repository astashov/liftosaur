import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { History, IHistoryEntryPersonalRecords } from "../models/history";
import { Button } from "./button";
import { ScreenActions } from "../actions/screenActions";
import { StringUtils } from "../utils/string";
import { Weight } from "../models/weight";
import { Exercise } from "../models/exercise";
import { useState } from "preact/hooks";
import { Confetti } from "./confetti";
import { IHistoryRecord, IScreenMuscle, ISet, ISettings } from "../types";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { INavCommon } from "../models/state";
import { Thunk } from "../ducks/thunks";
import { GroupHeader } from "./groupHeader";
import { HistoryEntryView } from "./historyEntry";
import { Collector } from "../utils/collector";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { TimeUtils } from "../utils/time";
import { MenuItemEditable } from "./menuItemEditable";
import { SendMessage } from "../utils/sendMessage";
import { HealthSync } from "../lib/healthSync";
import { WorkoutSocialShareSheet } from "./workoutSocialShareSheet";
import { BottomSheet } from "./bottomSheet";
import { IconInstagram } from "./icons/iconInstagram";
import { WorkoutShareButton } from "./workoutShareButton";
import { IconLink } from "./icons/iconLink";
import { IconKebab } from "./icons/iconKebab";
import { IconPicture } from "./icons/iconPicture";
import { Share } from "../models/share";
import { ClipboardUtils } from "../utils/clipboard";
import { InternalLink } from "../internalLink";
import { LinkButton } from "./linkButton";
import { IconTiktok } from "./icons/iconTiktok";

interface IProps {
  history: IHistoryRecord[];
  settings: ISettings;
  userId?: string;
  dispatch: IDispatch;
  navCommon: INavCommon;
}

export function ScreenFinishDay(props: IProps): JSX.Element {
  const record = props.history[0];

  const allPrs = History.getPersonalRecords(props.history);
  const recordPrs = allPrs[record.id] || {};
  const totalWeight = History.totalRecordWeight(record, props.settings.units);

  const startedEntries = History.getStartedEntries(record);
  const totalReps = History.totalRecordReps(record);
  const totalSets = History.totalRecordSets(record);
  const [syncToAppleHealth, setSyncToAppleHealth] = useState(!!props.settings.appleHealthSyncWorkout);
  const [syncToGoogleHealth, setSyncToGoogleHealth] = useState(!!props.settings.googleHealthSyncWorkout);

  const historyCollector = Collector.build([record]).addFn(History.collectMuscleGroups(props.settings));
  const [muscleGroupsData] = historyCollector.run();
  const muscleGroups = ObjectUtils.keys(muscleGroupsData).reduce<[IScreenMuscle, number][]>((memo, mg) => {
    const values = muscleGroupsData[mg];
    if (values[2][0] > 0 && mg !== "total") {
      memo.push([mg, values[2][0]]);
    }
    return memo;
  }, []);
  muscleGroups.sort((a, b) => b[1] - a[1]);
  const muscleGroupsGrouped = CollectionUtils.splitIntoNGroups(muscleGroups, 2);

  return (
    <Surface
      navbar={<NavbarView dispatch={props.dispatch} navCommon={props.navCommon} title="Congratulations!" />}
      footer={<></>}
    >
      <section className="px-4">
        <section className="px-4 pb-2 text-center">
          <div className="text-sm text-grayv2-main">{record.programName}</div>
          <div className="text-base">{record.dayName}</div>
        </section>
        <div className="px-4 pt-2 pb-3 rounded-lg bg-purplev2-100">
          <GroupHeader name="Totals" />
          <div className="flex gap-2">
            <ul className="flex-1">
              <li>
                <span className="mr-1">🕐</span> Time:{" "}
                <strong>{TimeUtils.formatHHMM(History.workoutTime(record))} h</strong>
              </li>
              <li>
                <span className="mr-1">🏋</span> Volume: <strong>{Weight.display(totalWeight)}</strong>
              </li>
            </ul>
            <ul className="flex-1">
              <li>
                <span className="mr-1">💪</span> Sets: <strong>{totalSets}</strong>
              </li>
              <li>
                <span className="mr-1">🔄</span> Reps: <strong>{totalReps}</strong>
              </li>
            </ul>
          </div>
        </div>

        {startedEntries.length > 0 ? (
          <>
            <div className="px-4 py-2 mt-2 rounded-lg bg-purplev2-100">
              <GroupHeader name="Exercises" />
              {startedEntries.map((entry, i) => {
                return (
                  <HistoryEntryView
                    showNotes={false}
                    entry={entry}
                    isNext={false}
                    isLast={i === startedEntries.length - 1}
                    settings={props.settings}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <></>
        )}

        <div className="px-4 py-2 mt-2 rounded-lg bg-purplev2-100">
          <GroupHeader name="Sets per muscle group" />
          <div className="flex gap-4">
            {muscleGroupsGrouped.map((group) => {
              return (
                <ul className="flex-1">
                  {group.map(([mg, value]) => {
                    return (
                      <li>
                        {StringUtils.capitalize(mg)}: <strong>{value}</strong>
                      </li>
                    );
                  })}
                </ul>
              );
            })}
          </div>
        </div>

        <PersonalRecords recordPrs={recordPrs} settings={props.settings} />

        {(SendMessage.isIos() && SendMessage.iosAppVersion() >= 11) ||
        (SendMessage.isAndroid() && SendMessage.androidAppVersion() >= 20) ? (
          <MobileShare userId={props.userId} history={props.history} settings={props.settings} />
        ) : (
          <WebappShare userId={props.userId} history={props.history} settings={props.settings} />
        )}

        {HealthSync.eligibleForAppleHealth() && (
          <div>
            <MenuItemEditable
              name="Sync to Apple Health"
              type="boolean"
              value={syncToAppleHealth ? "true" : "false"}
              onChange={(newValue?: string) => {
                setSyncToAppleHealth(newValue === "true");
              }}
            />
          </div>
        )}
        {HealthSync.eligibleForGoogleHealth() && (
          <div>
            <MenuItemEditable
              name="Sync to Google Health Connect"
              type="boolean"
              value={syncToGoogleHealth ? "true" : "false"}
              onChange={(newValue?: string) => {
                setSyncToGoogleHealth(newValue === "true");
              }}
            />
          </div>
        )}

        <div className="flex w-full gap-8 px-4 pt-4">
          <div className="flex-1 text-center">
            <Button
              name="finish-day-continue"
              kind="orange"
              className="w-32"
              data-cy="finish-day-continue"
              onClick={() => {
                SendMessage.toIosAndAndroid({
                  type: "finishWorkout",
                  healthSync:
                    (HealthSync.eligibleForAppleHealth() && syncToAppleHealth) ||
                    (HealthSync.eligibleForGoogleHealth() && syncToGoogleHealth)
                      ? "true"
                      : "false",
                  calories: `${History.calories(record)}`,
                  intervals: JSON.stringify(record.intervals),
                });
                ScreenActions.setScreen(props.dispatch, "main");
                props.dispatch(Thunk.maybeRequestReview());
                props.dispatch(Thunk.maybeRequestSignup());
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      </section>
      <Confetti />
    </Surface>
  );
}

interface IPersonalRecords {
  recordPrs: Partial<Record<string, IHistoryEntryPersonalRecords>>;
  settings: ISettings;
}

interface IPersonalRecordItems {
  maxWeight: {
    exerciseKey: string;
    set: ISet;
    prev?: ISet;
  }[];
  max1RM: {
    exerciseKey: string;
    set: ISet;
    prev?: ISet;
  }[];
}

function PersonalRecords(props: IPersonalRecords): JSX.Element {
  if (ObjectUtils.keys(props.recordPrs).length === 0) {
    return (
      <section className="px-4 pt-8 pb-4 text-center">
        <div>No new personal records this time</div>
      </section>
    );
  }

  const items = ObjectUtils.keys(props.recordPrs).reduce<IPersonalRecordItems>(
    (memo, key) => {
      const maxWeight = props.recordPrs[key]?.maxWeightSet;
      if (maxWeight) {
        memo.maxWeight.push({ exerciseKey: key, set: maxWeight, prev: props.recordPrs[key]?.prevMaxWeightSet });
      }
      const max1RM = props.recordPrs[key]?.max1RMSet;
      if (max1RM) {
        memo.max1RM.push({ exerciseKey: key, set: max1RM, prev: props.recordPrs[key]?.prevMax1RMSet });
      }
      return memo;
    },
    { maxWeight: [], max1RM: [] }
  );

  return (
    <section className="px-4 py-4 mt-4">
      <h3
        className="pb-1 font-bold text-yellow-600"
        dangerouslySetInnerHTML={{ __html: "&#x1F3C6 New Personal Records" }}
      />
      {items.maxWeight.length > 0 && (
        <>
          <h4 className="text-xs text-grayv2-main">Max Weight</h4>
          <ul className="pb-2">
            {items.maxWeight.map((item) => {
              const exerciseType = Exercise.fromKey(item.exerciseKey);
              const exercise = Exercise.get(exerciseType, props.settings.exercises);
              return (
                <li>
                  <div>
                    <strong>{exercise.name}</strong>:{" "}
                    <span className="whitespace-nowrap">
                      <strong className="text-greenv2-main">{Weight.display(item.set.weight)}</strong>,{" "}
                      {item.set.completedReps || 0} {StringUtils.pluralize("rep", item.set.completedReps || 0)}
                    </span>
                  </div>
                  {item.prev != null && (
                    <div className="text-xs italic text-gray-700">
                      (was {item.prev.completedReps || 0} × {Weight.display(item.prev.weight)})
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {items.max1RM.length > 0 && (
        <>
          <h4 className="text-xs text-grayv2-main">Max Estimated One Rep Max</h4>
          <ul className="pb-2">
            {items.max1RM.map((item) => {
              const exerciseType = Exercise.fromKey(item.exerciseKey);
              const exercise = Exercise.get(exerciseType, props.settings.exercises);
              const estimated1RM = Weight.getOneRepMax(
                item.set.weight,
                item.set.completedReps || 0,
                item.set.completedRpe ?? item.set.rpe
              );
              const previous1RM = item.prev
                ? Weight.getOneRepMax(
                    item.prev.weight || 0,
                    item.prev.completedReps || 0,
                    item.prev.completedRpe ?? item.prev.rpe
                  )
                : undefined;
              const setRpe = item.set.completedRpe ?? item.set.rpe;
              const prevRpe = item.prev?.completedRpe ?? item.prev?.rpe;
              return (
                <li>
                  <div>
                    <strong>{exercise.name}</strong>:{" "}
                    <span className="whitespace-nowrap">
                      <strong className="text-greenv2-main">{Weight.display(estimated1RM)}</strong> (
                      {item.set.completedReps || 0} × {Weight.display(item.set.weight)}
                      {setRpe ? ` @${setRpe}` : ""})
                    </span>
                  </div>
                  {item.prev != null && previous1RM && (
                    <div className="text-xs italic text-gray-700">
                      (was <strong>{Weight.display(previous1RM)}</strong>, {item.prev.completedReps || 0} ×{" "}
                      {Weight.display(item.prev.weight)}
                      {prevRpe ? ` @${prevRpe}` : ""})
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

interface IMobileShareProps {
  history: IHistoryRecord[];
  settings: ISettings;
  userId?: string;
}

function MobileShare(props: IMobileShareProps): JSX.Element {
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const [shareType, setShareType] = useState<"tiktok" | "igstory" | "igfeed">("igstory");

  return (
    <div>
      <div className="px-4 py-4">
        <GroupHeader name="Share it!" />
        <div className="flex justify-between gap-4 text-xs text-grayv2-main">
          <div className="text-center">
            <button
              className="nm-finishday-share-igstory"
              onClick={() => {
                setShareType("igstory");
                setIsShareShown(true);
              }}
            >
              <IconInstagram />
            </button>
            <div>IG Story</div>
          </div>
          <div className="text-center">
            <button
              className="nm-finishday-share-igfeed"
              onClick={() => {
                setShareType("igfeed");
                setIsShareShown(true);
              }}
            >
              <IconInstagram />
            </button>
            <div>IG Feed</div>
          </div>
          <div className="text-center">
            <button
              className="nm-finishday-share-tiktok"
              onClick={() => {
                setShareType("tiktok");
                setIsShareShown(true);
              }}
            >
              <IconTiktok />
            </button>
            <div>Tiktok</div>
          </div>
          <div className="text-center">
            <WorkoutShareButton
              history={props.history}
              record={props.history[0]}
              settings={props.settings}
              icon={<IconKebab />}
            />
            <div>More</div>
          </div>
        </div>
        <div className="mt-1 text-center">
          <LinkButton
            name="copy-workout-link"
            onClick={() => {
              if (props.userId) {
                const link = Share.generateLink(props.userId, props.history[0].id);
                ClipboardUtils.copy(link);
                alert("Copied!");
              } else {
                alert("You should be logged in to copy link to a workout");
              }
            }}
          >
            or just copy a link
          </LinkButton>
        </div>
      </div>
      <BottomSheet isHidden={!isShareShown} onClose={() => setIsShareShown(false)} shouldShowClose={true}>
        <WorkoutSocialShareSheet
          history={props.history}
          type={shareType}
          isHidden={!isShareShown}
          record={props.history[0]}
          settings={props.settings}
        />
      </BottomSheet>
    </div>
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
    <div>
      <div className="px-4 py-4">
        <GroupHeader name="Share it!" />
        <div className="flex justify-between gap-4 text-xs text-grayv2-main">
          <div className="text-center">
            <WorkoutShareButton
              history={props.history}
              record={props.history[0]}
              settings={props.settings}
              icon={<IconPicture />}
            />
            <div>Image</div>
          </div>
          <div className="text-center">
            <button
              className="w-10 h-10 rounded-full bg-grayv2-100"
              onClick={() => {
                if (userId) {
                  const link = Share.generateLink(userId, props.history[0].id);
                  ClipboardUtils.copy(link);
                  setCopiedLink(link);
                } else {
                  alert("You should be logged in to copy link to a workout");
                }
              }}
            >
              <IconLink className="inline-block" />
            </button>
            {copiedLink ? (
              <div>
                <span>Copied: </span>
                <InternalLink name="shared-workout-link" href={copiedLink} className="font-bold underline text-bluev2">
                  Link
                </InternalLink>
              </div>
            ) : (
              <div>Copy Link</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
