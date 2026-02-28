import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
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
import { ScreenActions_setScreen } from "../actions/screenActions";
import { Weight_display } from "../models/weight";
import { useState } from "preact/hooks";
import { Confetti } from "./confetti";
import { IHistoryRecord, IScreenMuscle, ISettings } from "../types";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { INavCommon } from "../models/state";
import { Thunk_maybeRequestReview, Thunk_maybeRequestSignup } from "../ducks/thunks";
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
import { WorkoutSocialShareSheet } from "./workoutSocialShareSheet";
import { BottomSheet } from "./bottomSheet";
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
import { ModalDayFromAdhoc } from "./modalDayFromAdhoc";
import { ImagePreloader_dynohappy } from "../utils/imagePreloader";
import { n } from "../utils/math";
import { Muscle_getMuscleGroupName } from "../models/muscle";

interface IProps {
  history: IHistoryRecord[];
  settings: ISettings;
  userId?: string;
  dispatch: IDispatch;
  navCommon: INavCommon;
}

export function ScreenFinishDay(props: IProps): JSX.Element {
  const record = props.history[0];

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
  const [showCreateProgramDay, setShowCreateProgramDay] = useState(false);
  const eligibleForCreateProgramDay = props.navCommon.allPrograms.every((p) => p.id !== record.programId);

  return (
    <Surface
      navbar={<NavbarView dispatch={props.dispatch} navCommon={props.navCommon} title="Congratulations!" />}
      addons={
        <Fragment>
          {showCreateProgramDay && (
            <ModalDayFromAdhoc
              stats={props.navCommon.stats}
              initialCurrentProgramId={props.navCommon.currentProgram?.id}
              allPrograms={props.navCommon.allPrograms}
              settings={props.settings}
              dispatch={props.dispatch}
              record={record}
              onClose={() => setShowCreateProgramDay(false)}
            />
          )}
        </Fragment>
      }
      footer={<></>}
    >
      <section className="px-4 text-sm">
        <div className="flex items-center justify-center pb-2">
          <div>
            <img src={ImagePreloader_dynohappy} className="block" style={{ width: 170, height: 150 }} />
          </div>
        </div>
        <section className="px-4 pb-2 text-center">
          <div className="text-sm text-text-secondary">{record.programName}</div>
          <div className="text-base">{record.dayName}</div>
        </section>
        <div className="px-4 pt-2 pb-3 rounded-lg bg-background-purpledark" data-cy="totals-summary">
          <GroupHeader name="Totals" />
          <div className="flex gap-2">
            <ul className="flex-1">
              <li>
                <span className="mr-1">🕐</span> Time:{" "}
                <strong>{TimeUtils_formatHHMM(History_workoutTime(record))} h</strong>
              </li>
              <li>
                <span className="mr-1">🏋</span> Volume: <strong>{Weight_display(totalWeight)}</strong>
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
            <div className="px-4 py-2 mt-2 rounded-lg bg-background-purpledark" data-cy="completed-exercises">
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

        <div data-cy="sets-per-muscle-group" className="px-4 py-2 mt-2 rounded-lg bg-background-purpledark">
          <GroupHeader name="Sets per muscle group" />
          <div className="flex gap-4">
            {muscleGroupsGrouped.map((group) => {
              return (
                <ul className="flex-1">
                  {group.map(([mg, value]) => {
                    return (
                      <li>
                        {Muscle_getMuscleGroupName(mg, props.settings)}: <strong>{n(value)}</strong>
                      </li>
                    );
                  })}
                </ul>
              );
            })}
          </div>
        </div>

        <section className="px-4 py-4 mt-4">
          <PersonalRecords prs={allPrs} historyRecords={[record]} settings={props.settings} />
        </section>

        {(SendMessage_isIos() && SendMessage_iosAppVersion() >= 11) ||
        (SendMessage_isAndroid() && SendMessage_androidAppVersion() >= 20) ? (
          <MobileShare userId={props.userId} history={props.history} settings={props.settings} />
        ) : (
          <WebappShare userId={props.userId} history={props.history} settings={props.settings} />
        )}

        {eligibleForCreateProgramDay && (
          <div className="mx-2 my-1 text-xs text-text-secondary">You can create a program day from this workout</div>
        )}

        <div className="flex w-full gap-4 pt-4">
          {eligibleForCreateProgramDay && (
            <div className="flex-1 text-center">
              <Button
                name="create-program-day"
                kind="purple"
                buttonSize="lg2"
                className="w-36"
                data-cy="create-program-day"
                onClick={() => {
                  setShowCreateProgramDay(true);
                }}
              >
                Create Program Day
              </Button>
            </div>
          )}
          <div className="flex-1 text-center">
            <Button
              name="finish-day-continue"
              kind="purple"
              className="w-36"
              data-cy="finish-day-continue"
              onClick={() => {
                ScreenActions_setScreen(props.dispatch, "main");
                props.dispatch(Thunk_maybeRequestReview());
                props.dispatch(Thunk_maybeRequestSignup());
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
        <div className="flex justify-between gap-4 text-xs text-text-secondary">
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
              icon={<IconKebab className="inline-block" />}
            />
            <div>More</div>
          </div>
        </div>
        <div className="mt-1 text-center">
          <LinkButton
            name="copy-workout-link"
            onClick={() => {
              if (props.userId) {
                const link = Share_generateLink(props.userId, props.history[0].id);
                ClipboardUtils_copy(link);
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
        <div className="flex justify-between gap-4 text-xs text-text-secondary">
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
              className="w-10 h-10 rounded-full bg-background-subtle"
              onClick={() => {
                if (userId) {
                  const link = Share_generateLink(userId, props.history[0].id);
                  ClipboardUtils_copy(link);
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
                <InternalLink
                  name="shared-workout-link"
                  href={copiedLink}
                  className="font-bold underline text-text-link"
                >
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
