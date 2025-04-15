import { h, JSX, ComponentChildren, Ref } from "preact";
import { ISettings, IPlannerProgram, IPlannerProgramWeek, IPlannerProgramDay } from "../types";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { StringUtils } from "../utils/string";
import { ExerciseImage } from "./exerciseImage";
import { equipmentName, Exercise } from "../models/exercise";
import { PlannerExerciseEvaluator } from "../pages/planner/plannerExerciseEvaluator";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerProgramExerciseSet } from "../pages/planner/models/types";
import { Markdown } from "./markdown";
import { Weight } from "../models/weight";
import { CollectionUtils } from "../utils/collection";
import { forwardRef, useEffect, useRef } from "preact/compat";
import { ProgramQrCode } from "./programQrCode";

export interface IProgramShareOutputOptions {
  showInfo: boolean;
  showWeekDescription: boolean;
  showDayDescription: boolean;
  showQRCode: boolean;
  columns: number;
  daysToShow: number[];
}

interface IProgramShareOutputProps {
  settings: ISettings;
  program: IPlannerProgram;
  options: IProgramShareOutputOptions;
  url?: string;
}

function Card(props: { children: ComponentChildren }): JSX.Element {
  return (
    <div
      style={{
        boxShadow: "0 0px 3px -1px rgba(0,0,0,.1),0 2px 1px -1px rgba(0,0,0,.06)",
      }}
      className="py-2 bg-white rounded-xl"
    >
      {props.children}
    </div>
  );
}

export const ProgramShareOutput = forwardRef(
  (props: IProgramShareOutputProps, ref: Ref<HTMLDivElement>): JSX.Element => {
    const options = props.options;
    const { evaluatedWeeks } = PlannerProgram.evaluate(props.program, props.settings);
    const minDays = Math.min(...evaluatedWeeks.map((week) => week.length));
    const maxDays = Math.max(...evaluatedWeeks.map((week) => week.length));
    const contentRef = useRef<HTMLDivElement>();
    const titleRef = useRef<HTMLDivElement>();
    let dayIndex = 0;

    useEffect(() => {
      if (contentRef.current && titleRef.current) {
        titleRef.current.style.width = `${contentRef.current.clientWidth}px`;
      }
    });

    useEffect(() => {
      const handleResize = () => {
        if (contentRef.current && titleRef.current) {
          titleRef.current.style.width = `${contentRef.current.clientWidth}px`;
        }
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, []);

    return (
      <div ref={ref}>
        <div className="flex gap-2 px-2 pt-2 bg-grayv2-50" ref={titleRef}>
          <div className="flex-1">
            {options.showInfo && (
              <div className="flex items-center gap-2 px-1 pt-2">
                <div className="text-5xl">🏋️</div>
                <div className="flex-1">
                  <div className="mb-1 text-xl font-bold">{props.program.name}</div>
                  <div className="text-base text-grayv2-main">
                    {props.program.weeks.length > 1 && <span>{props.program.weeks.length} weeks, </span>}
                    {minDays === maxDays ? (
                      <span>
                        {minDays} {StringUtils.pluralize("day", minDays)}
                      </span>
                    ) : (
                      <span>
                        {minDays}-{maxDays} days
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {props.url && options.showQRCode && <ProgramQrCode url={props.url} size="5rem" />}
        </div>
        <div className="p-2 bg-grayv2-50" ref={contentRef} style={{ width: "max-content" }}>
          {props.program.weeks.map((week, weekIndex) => {
            let dayInWeekIndex = 0;
            const visibleDays = week.days.filter((day) => {
              const result = options.daysToShow.includes(dayIndex);
              dayIndex += 1;
              return result;
            });
            const groupedDays = CollectionUtils.inGroupsOf(options.columns, visibleDays);
            return (
              <div style={{ width: "max-content" }}>
                {options.showWeekDescription && week.description && visibleDays.length > 0 && (
                  <div className="mt-2">
                    <Card>
                      <div className="px-4 pt-1 text-sm">
                        <Markdown value={week.description} />
                      </div>
                    </Card>
                  </div>
                )}
                {groupedDays.map((days) => {
                  return (
                    <div className="flex gap-2">
                      {days.map((day) => {
                        const evaluatedDay = evaluatedWeeks[weekIndex][dayInWeekIndex];
                        if (!evaluatedDay.success) {
                          return <div />;
                        }
                        const data = evaluatedDay.data;
                        const item = (
                          <div className="mt-2" style={{ width: "24rem" }}>
                            <Workout
                              isMultiweek={props.program.weeks.length > 1}
                              week={week}
                              day={day}
                              exercises={data.filter((e) => !e.notused)}
                              settings={props.settings}
                              options={props.options}
                            />
                          </div>
                        );
                        dayInWeekIndex += 1;
                        return item;
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="mt-1 text-sm text-right">
            <img
              className="inline mr-1 align-middle"
              style={{ width: "2em", height: "2em" }}
              src="/images/logo.svg"
              alt="Liftosaur Logo"
            />
            <span className="font-bold align-middle">Liftosaur</span>
          </div>
        </div>
      </div>
    );
  }
);

interface IWorkoutProps {
  options: IProgramShareOutputOptions;
  week: IPlannerProgramWeek;
  day: IPlannerProgramDay;
  exercises: IPlannerProgramExercise[];
  settings: ISettings;
  isMultiweek: boolean;
}

function Workout(props: IWorkoutProps): JSX.Element {
  const { week, day, exercises } = props;
  const setsNumber = exercises
    .map((e) => PlannerProgramExercise.sets(e).reduce((m, a) => m + (a.repRange?.numberOfSets || 0), 0))
    .reduce((a, b) => a + b, 0);
  return (
    <Card>
      <div className="px-2">
        <h2 className="px-2 py-1 text-lg font-bold">
          {props.isMultiweek ? `${week.name} ` : ""}
          {day.name}
        </h2>
      </div>
      <div className="px-4 text-grayv2-main">
        {exercises.length} {StringUtils.pluralize("exercise", exercises.length)}
        {" · "}
        {setsNumber} {StringUtils.pluralize("set", setsNumber)}
      </div>
      {day.description && (
        <div className="px-2 py-1 mx-4 my-2 text-xs rounded-md bg-grayv2-50 text-grayv2-main">
          <Markdown value={day.description} />
        </div>
      )}
      {exercises.map((plannerProgramExercise, i) => {
        const { name, equipment } = PlannerExerciseEvaluator.extractNameParts(
          plannerProgramExercise.fullName,
          props.settings
        );
        const nameAndEquipment = `${name}${equipment ? `, ${equipmentName(equipment, props.settings.equipment)}` : ""}`;
        const exercise = Exercise.findByNameAndEquipment(nameAndEquipment, props.settings.exercises);
        if (!exercise) {
          return <div />;
        }
        const descriptions = plannerProgramExercise.descriptions.values.filter((d) => d.isCurrent);
        if (descriptions.length === 0) {
          const firstDescription = plannerProgramExercise.descriptions.values[0];
          if (firstDescription != null) {
            descriptions.push(firstDescription);
          }
        }

        return (
          <div className={`mx-4 pb-4 ${i > 0 ? "pt-2 border-t border-grayv2-100" : ""}`}>
            <div className={`flex items-stretch pl-1`} style={{ paddingRight: "1px" }} key={Exercise.toKey(exercise)}>
              <div className="flex items-center w-12 pr-2">
                <ExerciseImage suppressCustom={true} exerciseType={exercise} size="small" settings={props.settings} />
              </div>
              <div className={`flex-1 flex flex-col justify-center`}>
                <div className={`flex gap-2 items-center w-full`}>
                  <div className="flex-1 font-bold">{plannerProgramExercise.fullName}</div>
                  <div className="pr-2">
                    {PlannerProgramExercise.sets(plannerProgramExercise).map((set) => {
                      return <Set set={set} />;
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-sm">
              <Progression exercise={plannerProgramExercise} />
            </div>
            {descriptions.length > 0 && (
              <div className="px-2 py-1 mt-2 text-xs rounded-md bg-grayv2-50 text-grayv2-main">
                {descriptions.map((d) => (
                  <Markdown key={d.value} value={d.value} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

interface ISetProps {
  set: IPlannerProgramExerciseSet;
}

function Set(props: ISetProps): JSX.Element {
  const set = props.set;
  const repRange = set.repRange;
  if (!repRange) {
    return <div />;
  }
  return (
    <div className="text-base leading-4 text-right whitespace-nowrap text-grayv2-main">
      {repRange.numberOfSets > 1 && (
        <span>
          <span className="font-semibold text-purplev2-main">{repRange.numberOfSets}</span>{" "}
          <span className="text-xs">×</span>{" "}
        </span>
      )}
      {repRange.minrep == null ? (
        <span className="font-semibold text-black">{repRange.maxrep}</span>
      ) : (
        <span>
          <span className="font-semibold text-black">{repRange.minrep}</span>-
          <span className="font-semibold text-black">{repRange.maxrep}</span>
        </span>
      )}
      {repRange.isAmrap && <span className="font-semibold text-blackv2">+</span>}
      {set.weight ? (
        <span>
          {" "}
          <span className="text-xs">×</span> <span className="text-blackv2">{set.weight.value}</span>
          {set.askWeight && <span className="font-semibold text-blackv2">+</span>}
          <span className="text-xs text-grayv2-main">{set.weight.unit}</span>
        </span>
      ) : set.percentage ? (
        <span>
          {" "}
          <span className="text-xs">×</span> <span className="text-blackv2">{set.percentage}</span>
          {set.askWeight && <span className="font-semibold text-blackv2">+</span>}
          <span className="text-xs text-grayv2-main">%</span>
        </span>
      ) : undefined}
      {set.rpe != null && (
        <span className="ml-1 text-greenv2-900">
          <span className="text-xs">@</span>
          <span className="text-sm">{set.rpe}</span>
        </span>
      )}
      {set.logRpe && <span className="text-greenv2-900">+</span>}
      {set.timer != null && (
        <span className="ml-1 text-xs text-purplev2-900">
          {set.timer}
          <span className="text-xs">s</span>
        </span>
      )}
    </div>
  );
}

interface IProgressionProps {
  exercise: IPlannerProgramExercise;
}

function Progression(props: IProgressionProps): JSX.Element | null {
  const type = PlannerProgramExercise.progressionType(props.exercise);
  if (type == null) {
    return null;
  }
  switch (type.type) {
    case "linear":
      return (
        <div>
          Linear Progression: <span className="font-bold text-greenv2-main">+{Weight.print(type.increase)}</span>
          {(type.successesRequired || 0 > 1) && (
            <span>
              {" "}
              after <span className="font-bold text-greenv2-main">{type.successesRequired}</span> successes
            </span>
          )}
          {type.decrease != null && type.decrease.value > 0 && (
            <span>
              , <span className="font-bold text-redv2-main">{Weight.print(type.decrease)}</span>
            </span>
          )}
          {type.decrease != null && type.decrease.value > 0 && (type.failuresRequired || 0) > 1 && (
            <span>
              {" "}
              after <span className="font-bold text-redv2-main">{type.failuresRequired}</span> failures
            </span>
          )}
          .
        </div>
      );
    case "double":
      return (
        <div>
          Double Progression: <span className="font-bold text-greenv2-main">+{Weight.print(type.increase)}</span> within{" "}
          <span className="font-bold">{type.minReps}</span>-<span className="font-bold">{type.maxReps}</span> rep range.
        </div>
      );
    case "sumreps":
      return (
        <div>
          Sum Reps Progression: <span className="font-bold text-greenv2-main">+{Weight.print(type.increase)}</span> if
          sum of all reps is at least <span className="font-bold">{type.reps}</span>.
        </div>
      );
    case "custom":
      return <div>Custom Progression</div>;
  }
}
