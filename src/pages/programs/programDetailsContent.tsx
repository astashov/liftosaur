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
import { Muscle } from "../../models/muscle";
import { MusclesView } from "../../components/muscles/musclesView";
import { Stats } from "../../models/stats";

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
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(evaluatedProgram, Stats.getEmpty(), settings));
  const descriptionText = props.fullDescription || program.description;

  return (
    <section className="px-4">
      <h1 className="text-2xl font-bold leading-8 text-center">{program.name} Program Explained</h1>
      {program.author && (
        <div className="mb-4 text-sm font-bold text-center">
          {program.url ? (
            <a href={program.url} target="_blank" className="underline text-text-link">
              By {program.author}
            </a>
          ) : (
            <span>By {program.author}</span>
          )}
        </div>
      )}
      <div className="flex flex-col sm:flex-row program-details-description" style={{ gap: "1rem" }}>
        <div className="flex-1 min-w-0">
          <Markdown
            className="program-details-description"
            value={descriptionText}
            directivesData={{
              exercise: { settings },
              exerciseExample: { settings, evaluatedProgram },
            }}
          />
        </div>
        <div className="w-64 mx-auto">
          <h3 className="text-lg font-bold leading-8 text-center">Muscle Balance</h3>
          <MusclesView title="Muscle Balance" settings={settings} points={points} hideListOfExercises={true} />
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
