import { h, JSX, ComponentChildren } from "preact";
import { ISettings, IPlannerProgram, IPlannerProgramWeek, IPlannerProgramDay } from "../types";
import { PlannerProgram } from "../pages/planner/models/plannerProgram";
import { StringUtils } from "../utils/string";
import { ExerciseImage } from "./exerciseImage";
import { Exercise } from "../models/exercise";
import { PlannerExerciseEvaluator } from "../pages/planner/plannerExerciseEvaluator";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerProgramExerciseSet } from "../pages/planner/models/types";
import { Markdown } from "./markdown";
import { Weight } from "../models/weight";

export interface IProgramShareOutputOptions {
  showInfo: boolean;
  columns: number;
  daysToShow: number[];
}

interface IProgramShareOutputProps {
  settings: ISettings;
  program: IPlannerProgram;
  options: IProgramShareOutputOptions;
}

function Card(props: { children: ComponentChildren }): JSX.Element {
  return <div className="py-2 bg-white shadow-md rounded-xl">{props.children}</div>;
}

export function ProgramShareOutput(props: IProgramShareOutputProps): JSX.Element {
  const options = props.options;
  const { evaluatedWeeks } = PlannerProgram.evaluate(props.program, props.settings);
  const minDays = Math.min(...evaluatedWeeks.map((week) => week.length));
  const maxDays = Math.max(...evaluatedWeeks.map((week) => week.length));

  return (
    <div className="p-2" style={{ background: "linear-gradient(to bottom, #5F49B9 0%, #413F87 23%, #252147 100%)" }}>
      {options.showInfo && (
        <Card>
          <div className="px-4 py-2">
            <div className="text-xl font-bold">{props.program.name}</div>
            <div className="text-sm text-grayv2-main">
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
        </Card>
      )}
      {props.program.weeks.map((week, weekIndex) => {
        return week.days.map((day, dayIndex) => {
          const evaluatedDay = evaluatedWeeks[weekIndex][dayIndex];
          if (!evaluatedDay.success) {
            return <div />;
          }
          const data = evaluatedDay.data;
          return (
            <div className="mt-2" style={{ maxWidth: "24rem" }}>
              <Workout week={week} day={day} exercises={data} settings={props.settings} />
            </div>
          );
        });
      })}
    </div>
  );
}

interface IWorkoutProps {
  week: IPlannerProgramWeek;
  day: IPlannerProgramDay;
  exercises: IPlannerProgramExercise[];
  settings: ISettings;
}

function Workout(props: IWorkoutProps): JSX.Element {
  const { week, day, exercises } = props;
  return (
    <Card>
      <div className="px-2">
        <h2 className="p-2 text-lg font-bold">
          {week.name} - {day.name}
        </h2>
      </div>
      {exercises.map((plannerProgramExercise, i) => {
        const { name } = PlannerExerciseEvaluator.extractNameParts(plannerProgramExercise.fullName, props.settings);
        const exercise = Exercise.findByNameAndEquipment(name, props.settings.exercises);
        if (!exercise) {
          return <div />;
        }
        const descriptions = plannerProgramExercise.descriptions.filter((d) => d.isCurrent);
        if (descriptions.length === 0) {
          const firstDescription = plannerProgramExercise.descriptions[0];
          if (firstDescription != null) {
            descriptions.push(firstDescription);
          }
        }

        return (
          <div className={`flex items-stretch pl-1`} style={{ paddingRight: "1px" }} key={Exercise.toKey(exercise)}>
            <div className="flex items-center w-12 p-2">
              <ExerciseImage exerciseType={exercise} size="small" settings={props.settings} />
            </div>
            <div className={`flex-1 flex flex-col justify-center py-2 ${i > 0 ? "border-t border-grayv2-100" : ""}`}>
              <div className="mr-2">
                {descriptions.map((d) => (
                  <Markdown key={d.value} value={d.value} />
                ))}
              </div>
              <div className={`flex gap-2 items-center w-full`}>
                <div className="flex-1 font-bold">{Exercise.nameWithEquipment(exercise, props.settings)}</div>
                <div className="pr-2">
                  {PlannerProgramExercise.sets(plannerProgramExercise).map((set) => {
                    return <Set set={set} />;
                  })}
                </div>
              </div>
              <div className="text-xs">
                <Progression exercise={plannerProgramExercise} />
              </div>
            </div>
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
    <div className="text-base leading-4 text-right whitespace-no-wrap text-grayv2-main">
      {repRange.numberOfSets > 1 && (
        <span>
          <span className="font-bold text-purplev2-main">{repRange.numberOfSets}</span> ×{" "}
        </span>
      )}
      {repRange.minrep === repRange.maxrep ? (
        <span className="font-bold text-black">{repRange.minrep}</span>
      ) : (
        <span>
          <span className="font-bold text-black">{repRange.minrep}</span>-
          <span className="font-bold text-black">{repRange.maxrep}</span>
        </span>
      )}
      {repRange.isAmrap && <span className="font-bold text-blackv2">+</span>}
      {set.weight ? (
        <span>
          {" "}
          x <span className="text-blackv2">{set.weight.value}</span>
          {set.askWeight && <span className="font-bold text-blackv2">+</span>}
          <span className="text-xs text-grayv2-main">{set.weight.unit}</span>
        </span>
      ) : set.percentage ? (
        <span>
          {" "}
          x <span className="text-blackv2">{set.percentage}</span>
          {set.askWeight && <span className="font-bold text-blackv2">+</span>}
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
          {type.decrease != null && (
            <span>
              , <span className="font-bold text-redv2-main">{Weight.print(type.decrease)}</span>
            </span>
          )}
          {(type.failuresRequired || 0 > 1) && (
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
          Double Progression: <span className="font-bold text-greenv2-main">+{Weight.print(type.increase)}</span>
          within <span className="font-bold">{type.minReps}</span>-<span className="font-bold">{type.maxReps}</span> rep
          range.
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
