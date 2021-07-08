import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { History } from "../models/history";
import { HeaderView } from "./header";
import { Button } from "./button";
import { ScreenActions } from "../actions/screenActions";
import { StringUtils } from "../utils/string";
import { Weight } from "../models/weight";
import { TimeUtils } from "../utils/time";
import { Exercise } from "../models/exercise";
import { useState } from "preact/hooks";
import { ModalShare } from "./modalShare";
import { Confetti } from "./confetti";
import { IHistoryRecord, ISettings } from "../types";

interface IProps {
  history: IHistoryRecord[];
  settings: ISettings;
  userId?: string;
  dispatch: IDispatch;
}

export function ScreenFinishDay(props: IProps): JSX.Element {
  const record = props.history[0];
  const prs = History.findAllPersonalRecords(record, props.history);
  const [isShareShown, setIsShareShown] = useState<boolean>(false);
  const totalWeight = History.totalRecordWeight(record, props.settings.units);

  return (
    <section className="h-full">
      <HeaderView title="Congratulations!!!" />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <section className="p-4 text-lg font-bold text-center">
          <h2 className="text-red-700">Great job finishing</h2>
        </section>
        <section className="px-4 text-center">
          <div className="text-lg">{record.programName}</div>
          <div className="text-gray-700">{record.dayName}</div>
          <div>
            Time: <strong>{TimeUtils.formatHHMM(record.endTime! - record.startTime)}</strong> hours
          </div>
          <div>
            Total weight lifted: <strong>{Weight.display(totalWeight)}</strong>
          </div>
        </section>
        {prs.size > 0 ? (
          <section className="px-4 py-8">
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
              kind="blue"
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
            <Button kind="green" onClick={() => ScreenActions.setScreen(props.dispatch, "main")}>
              Continue
            </Button>
          </div>
        </div>
      </section>
      {isShareShown && props.userId != null && (
        <ModalShare userId={props.userId} id={record.id} onClose={() => setIsShareShown(false)} />
      )}
      <Confetti />
    </section>
  );
}
