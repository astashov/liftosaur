import { h, JSX } from "preact";
import { Settings } from "../../models/settings";
import { IProgram } from "../../types";
import { IAudioInterface } from "../../lib/audioInterface";
import { ProgramDetailsWorkoutPlayground } from "./programDetails/programDetailsWorkoutPlayground";
import { ProgramDetailsUpsell } from "./programDetails/programDetailsUpsell";
import { Program } from "../../models/program";
import { ObjectUtils } from "../../utils/object";
import { Markdown } from "../../components/markdown";
import { IconCheckCircle } from "../../components/icons/iconCheckCircle";
import { IconEditSquare } from "../../components/icons/iconEditSquare";
import { PlannerStatsUtils } from "../planner/models/plannerStatsUtils";
import { IPlannerEvalResult } from "../planner/plannerExerciseEvaluator";
import { IconBack } from "../../components/icons/iconBack";
import { PlannerWeekStats } from "../planner/components/plannerWeekStats";

export interface IProgramDetailsContentProps {
  program: IProgram;
  fullDescription?: string;
  client: Window["fetch"];
  audio: IAudioInterface;
  userAgent?: string;
}

export function ProgramDetailsContent(props: IProgramDetailsContentProps): JSX.Element {
  const { program } = props;
  const settings = Settings.build();
  const fullProgram = Program.fullProgram(ObjectUtils.clone(program), settings);
  const evaluatedProgram = Program.evaluate(ObjectUtils.clone(program), settings);
  const descriptionText = props.fullDescription || program.description;

  const firstWeek = evaluatedProgram.weeks[0];
  const daysPerWeek = firstWeek?.days.length ?? 0;
  const allExercises = firstWeek?.days.flatMap((d) => d.exercises.filter((e) => !e.notused)) ?? [];
  const exercisesPerDay = daysPerWeek > 0 ? Math.round(allExercises.length / daysPerWeek) : 0;

  const restTimer = settings.timers.workout ?? 90;
  const totalTimeMs =
    firstWeek?.days.reduce((acc, d) => {
      return acc + PlannerStatsUtils.dayApproxTimeMs(d.exercises, restTimer);
    }, 0) ?? 0;
  const avgTimeMinutes = daysPerWeek > 0 ? Math.round(totalTimeMs / daysPerWeek / 1000 / 60) : 0;

  const evaluatedDays: IPlannerEvalResult[] =
    firstWeek?.days.map((d) => ({ success: true as const, data: d.exercises })) ?? [];

  return (
    <section className="px-4">
      <div className="flex flex-col lg:flex-row" style={{ gap: "2rem" }}>
        <div className="flex-1 min-w-0">
          <h1 className="flex items-center text-2xl font-bold leading-8">
            <a href="/programs" className="flex-shrink-0 mr-3">
              <IconBack />
            </a>
            {program.name} Program
          </h1>
          {program.author && (
            <div className="mt-2 mb-4 text-sm font-bold">
              {program.url ? (
                <a href={program.url} target="_blank" className="underline text-text-link">
                  by {program.author}
                </a>
              ) : (
                <span>by {program.author}</span>
              )}
            </div>
          )}
          <Markdown
            className="program-details-description"
            value={descriptionText}
            directivesData={{
              exercise: { settings },
              exerciseExample: { settings, evaluatedProgram },
            }}
          />
        </div>
        <div className="flex-shrink-0 w-72">
          <div className="lg:sticky lg:top-4">
            <h3 className="mb-2 text-xl font-bold">Summary</h3>
            <div className="mb-1 text-sm">
              {daysPerWeek} days per week, {exercisesPerDay} exercises per day
            </div>
            {avgTimeMinutes > 0 && (
              <div className="mb-4 text-sm text-text-secondary">
                <span>&#9201;</span> {avgTimeMinutes}m
              </div>
            )}

            <PlannerWeekStats dispatch={() => {}} evaluatedDays={evaluatedDays} settings={settings} />
          </div>
        </div>
      </div>
      <div className="w-32 h-px mx-auto my-8 b bg-border-neutral" />
      <h3 className="mb-4 text-xl font-bold leading-8">Try it out in interactive playground!</h3>
      <p className="mb-4">
        Tap on squares to finish sets. Tap multiple times to reduce completed reps. Finish workout and see what the next
        time the workout would look like (with possibly updated weights, reps and sets).
      </p>
      <p className="mb-4">
        For convenience, you can finish all the sets of an exercise by clicking on the{" "}
        <IconCheckCircle className="inline-block" isChecked={true} color="#BAC4CD" /> icon. And you can adjust the
        exercise variables (weight, reps, TM, RIR, etc) by clicking on the <IconEditSquare className="inline-block" />{" "}
        icon.
      </p>
      <ProgramDetailsWorkoutPlayground program={fullProgram} settings={settings} />
      <div className="mt-8">
        <ProgramDetailsUpsell userAgent={props.userAgent} />
      </div>
    </section>
  );
}
