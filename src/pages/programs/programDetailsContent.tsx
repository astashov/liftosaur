import { h, JSX } from "preact";
import { Settings } from "../../models/settings";
import { IProgram } from "../../types";
import { IAudioInterface } from "../../lib/audioInterface";
import { ProgramDetailsWorkoutPlayground } from "./programDetails/programDetailsWorkoutPlayground";
import { ProgramDetailsUpsell } from "./programDetails/programDetailsUpsell";
import { Program } from "../../models/program";
import { ObjectUtils } from "../../utils/object";
import { Markdown } from "../../components/markdown";
import { PlannerStatsUtils } from "../planner/models/plannerStatsUtils";
import { IPlannerEvalResult } from "../planner/plannerExerciseEvaluator";
import { IconBack } from "../../components/icons/iconBack";
import { PlannerWeekStats } from "../planner/components/plannerWeekStats";
import { IconWatch } from "../../components/icons/iconWatch";

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
  const maxWidth = 1200;

  const evaluatedDays: IPlannerEvalResult[] =
    firstWeek?.days.map((d) => ({ success: true as const, data: d.exercises })) ?? [];

  return (
    <section className="px-4">
      <div className="flex flex-col mx-auto lg:flex-row" style={{ gap: "2rem", maxWidth }}>
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
              <div className="flex items-center gap-1 mb-4 text-sm text-text-secondary">
                <div>
                  <IconWatch />
                </div>{" "}
                <div>{avgTimeMinutes}m</div>
              </div>
            )}

            <PlannerWeekStats dispatch={() => {}} evaluatedDays={evaluatedDays} settings={settings} />
          </div>
        </div>
      </div>
      <div className="w-32 h-px mx-auto my-8 b bg-border-neutral" />
      <ProgramDetailsWorkoutPlayground program={fullProgram} settings={settings} maxWidth={maxWidth} />
      <div className="mt-8">
        <ProgramDetailsUpsell userAgent={props.userAgent} maxWidth={maxWidth} />
      </div>
    </section>
  );
}
