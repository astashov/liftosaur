import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { History } from "../models/history";
import { Button } from "./button";
import { ScreenActions } from "../actions/screenActions";
import { StringUtils } from "../utils/string";
import { Weight } from "../models/weight";
import { TimeUtils } from "../utils/time";
import { equipmentName, Exercise } from "../models/exercise";
import { useState } from "preact/hooks";
import { ModalShare } from "./modalShare";
import { Confetti } from "./confetti";
import { IHistoryRecord, ISettings } from "../types";
import { NavbarView } from "./navbar";
import { Surface } from "./surface";
import { ILoading } from "../models/state";
import { IScreen } from "../models/screen";
import { Thunk } from "../ducks/thunks";
import { ExerciseImage } from "./exerciseImage";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { Reps } from "../models/set";

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
  const completedExercises = record.entries.filter((e) => e.sets.filter((s) => (s.completedReps || 0) > 0).length > 0);
  const prs = History.findAllPersonalRecords(record, props.history);
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const totalWeight = History.totalRecordWeight(record, props.settings.units);
  const totalReps = History.totalRecordReps(record);
  const totalSets = record.entries.reduce(
    (memo, e) => memo + History.roundSetsInEntry(e, props.settings, e.exercise.equipment).sets.length,
    0
  );

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
          <div className="text-base text-grayv2-main">{record.programName}</div>
          <div className="text-lg">{record.dayName}</div>
        </section>
        <div className="flex px-4 py-2 justify-center rounded-lg bg-purplev2-100">
          <div className="flex flex-col gap-2">
            <div dangerouslySetInnerHTML={{ __html: "&#x1F550  Time spent:" }} />
            <div dangerouslySetInnerHTML={{ __html: "&#x1F3CB  Total volume:" }} />
            <div dangerouslySetInnerHTML={{ __html: "&#x1F4AA  Total sets:" }} />
            <div dangerouslySetInnerHTML={{ __html: "&#x1F504  Total reps:" }} />
          </div>
          <div className="flex flex-col mx-4 gap-2 font-bold">
            <div>
              <strong>{TimeUtils.formatHHMM(record.endTime! - record.startTime)}</strong> hours
            </div>
            <strong>{Weight.display(totalWeight)}</strong>
            <strong>{totalSets}</strong>
            <strong>{totalReps}</strong>
          </div>
        </div>

        {completedExercises.length > 0 ? (
          <>
            <div className="text-base font-bold pt-2">Your completed exercises</div>
            <div className="flex rounded-lg bg-purplev2-100">
              <div className={"flex flex-col m-1 w-full"}>
                {completedExercises.map((e, idx) => {
                  return (
                    <div
                      className={`flex flex-1 flex-row items-center py-1 px-1 ${
                        idx < completedExercises.length - 1 ? "border-b border-grayv2-100" : ""
                      }`}
                    >
                      <div className="justify-center" style={{ minWidth: "2.25rem" }}>
                        <ExerciseImage
                          settings={props.settings}
                          className="w-8 mr-3"
                          exerciseType={e.exercise}
                          size="small"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className={"flex-1 flex-col"}>
                            <div className="pr-2 font-bold">
                              {Exercise.getById(e.exercise.id, props.settings.exercises).name}
                            </div>
                            {e.exercise.equipment && (
                              <div className="text-xs text-grayv2-600">
                                {equipmentName(e.exercise.equipment, props.settings)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <HistoryRecordSetsView
                              sets={Reps.roundSets(e.sets, props.settings, e.exercise.equipment)}
                              settings={props.settings}
                              isNext={false}
                              noWrap={true}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <></>
        )}

        {prs.size > 0 ? (
          <section className="px-4 py-4">
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
                      <span className="whitespace-no-wrap">
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
          <section className="px-4 py-8 text-center">
            <div>No new personal records this time</div>
          </section>
        )}

        <div className="fixed left-0 z-10 flex w-full px-16 py-4" style={{ bottom: "40px" }}>
          <div className="flex-1">
            <Button
              className="ls-finish-day-share"
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
          <div>
            <Button
              kind="orange"
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
