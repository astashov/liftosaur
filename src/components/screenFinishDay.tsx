import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { History } from "../models/history";
import { Button } from "./button";
import { ScreenActions } from "../actions/screenActions";
import { StringUtils } from "../utils/string";
import { Weight } from "../models/weight";
import { TimeUtils } from "../utils/time";
import { Exercise } from "../models/exercise";
import { useState } from "preact/hooks";
import { ModalShare } from "./modalShare";
import { Confetti } from "./confetti";
import { IHistoryRecord, IScreenMuscle, ISettings } from "../types";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { ILoading } from "../models/state";
import { IScreen } from "../models/screen";
import { Thunk } from "../ducks/thunks";
import { GroupHeader } from "./groupHeader";
import { HistoryEntryView } from "./historyEntry";
import { Collector } from "../utils/collector";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";

interface IProps {
  history: IHistoryRecord[];
  settings: ISettings;
  userId?: string;
  dispatch: IDispatch;
  loading: ILoading;
  screenStack: IScreen[];
}

export function ScreenFinishDay(props: IProps): JSX.Element {
  const record = props.history[0];

  const prs = History.findAllPersonalRecords(record, props.history);
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const totalWeight = History.totalRecordWeight(record, props.settings.units);

  const startedEntries = History.getStartedEntries(record);
  const totalReps = History.totalRecordReps(record);
  const totalSets = History.totalRecordSets(record);

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
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Congratulations!"
        />
      }
      footer={<></>}
      addons={
        <>
          {isShareShown && props.userId != null && (
            <ModalShare userId={props.userId} id={record.id} onClose={() => setIsShareShown(false)} />
          )}
        </>
      }
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
                <strong>{TimeUtils.formatHHMM(record.endTime! - record.startTime)}</strong>
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

        {prs.size > 0 ? (
          <section className="px-4 py-4 mt-4">
            <h3 className="pb-2 font-bold" dangerouslySetInnerHTML={{ __html: "&#x1F3C6 New Personal Records" }} />
            <ul>
              {Array.from(prs.keys()).map((exerciseType) => {
                const exercise = Exercise.get(exerciseType, props.settings.exercises);
                const set = prs.get(exerciseType)!;
                const previousMaxSet = History.findMaxSet(exerciseType, props.history.slice(1));
                return (
                  <li>
                    <div>
                      <strong>{exercise.name}</strong>:{" "}
                      <span className="whitespace-nowrap">
                        {set.completedReps || 0} {StringUtils.pluralize("rep", set.completedReps || 0)} x{" "}
                        {Weight.display(Weight.convertTo(set.weight, props.settings.units))}
                      </span>
                    </div>
                    {previousMaxSet != null && (
                      <div className="text-xs italic text-gray-700">
                        (was {previousMaxSet.completedReps!} x {Weight.display(previousMaxSet.weight)})
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section className="px-4 pt-8 pb-4 text-center">
            <div>No new personal records this time</div>
          </section>
        )}

        <div className="flex w-full gap-8 px-4 pt-4">
          <div className="flex-1 text-center">
            <Button
              name="finish-day-share"
              className="w-32 ls-finish-day-share"
              kind="purple"
              onClick={() => {
                if (props.userId == null) {
                  alert("You should be logged in to share workouts.");
                } else {
                  setIsShareShown(true);
                }
              }}
            >
              Share
            </Button>
          </div>
          <div className="flex-1 text-center">
            <Button
              name="finish-day-continue"
              kind="orange"
              className="w-32"
              data-cy="finish-day-continue"
              onClick={() => {
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
