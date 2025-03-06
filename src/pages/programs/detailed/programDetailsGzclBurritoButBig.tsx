import { h, JSX } from "preact";
import { IProgram, ISettings } from "../../../types";
import { IAudioInterface } from "../../../lib/audioInterface";
import { ObjectUtils } from "../../../utils/object";
import { IconEditSquare } from "../../../components/icons/iconEditSquare";
import { IconCheckCircle } from "../../../components/icons/iconCheckCircle";
import { ProgramDetailsUpsell } from "../programDetails/programDetailsUpsell";
import { Muscle } from "../../../models/muscle";
import { MusclesView } from "../../../components/muscles/musclesView";
import { ProgramDetailsGzclPrinciple } from "./programDetailsGzclPrinciple";
import { ProgramDetailsWorkoutPlayground } from "../programDetails/programDetailsWorkoutPlayground";
import { Program } from "../../../models/program";

export interface IProgramDetailsGzclBurritoButBigProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsGzclBurritoButBig(props: IProgramDetailsGzclBurritoButBigProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const evaluatedProgram = Program.evaluate(program, props.settings);
  const t3Exercises = Program.getAllProgramExercises(evaluatedProgram).filter((e) =>
    /(T3a|T3b)/.test(e.descriptions.values.join("") || "")
  );
  for (const exercise of t3Exercises) {
    for (const variation of exercise.evaluatedSetVariations) {
      for (const sets of variation.sets) {
        sets.maxrep = 10;
      }
    }
  }
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(evaluatedProgram, props.settings));

  return (
    <section className="px-4">
      <h1 className="text-2xl font-bold leading-8 text-center">GZCL: General Gainz - Burrito But Big</h1>
      <div className="mb-4 text-sm font-bold text-center">
        <a href="https://www.gainzfever.com/" target="_blank" className="underline text-bluev2">
          By Cody Lefever
        </a>
      </div>
      <div className="flex flex-col sm:flex-row program-details-description" style={{ gap: "1rem" }}>
        <div className="flex-1 min-w-0">
          <p>
            Burrito But Big is a weightlifting program created by the Reddit user{" "}
            <a href="https://www.reddit.com/user/benjaminbk/" target="_blank">
              u/benjaminbk
            </a>{" "}
            , based on the <strong>GZCL principle</strong> from{" "}
            <a href="https://www.gainzfever.com/" target="_blank">
              Cody Lefever
            </a>
            . This program is a hypertrophy adaptation of the{" "}
            <a href="/programs/gzcl-general-gainz" target="_blank">
              General Gainz program
            </a>{" "}
            , presented as a 12-week program. There're several fun progression schemes, you can mix and match in your
            program, and generally the program is fun and efficient to run.
          </p>
          <ProgramDetailsGzclPrinciple />
          <h2>Application of the GZCL Principle to the Burrito But Big program</h2>
          <p>
            I highly recommend to read{" "}
            <a
              href="https://www.reddit.com/r/gzcl/comments/12ggfn7/burrito_but_big_a_general_gainzbased_12week/"
              target="_blank"
            >
              the Reddit post
            </a>{" "}
            describing the program and all the progressions and details.
          </p>
          <p>
            Check the interactive playground below to see how the program works, and what the weights/sets/reps look
            like for each week. You can edit the 2RM, 5RM, etc weights for each exercise, and see how the weight
            changes.
          </p>
          <p>
            You can run GZCL: General Gainz - Burrito But Big program in the Liftosaur app. You only would need to set
            initial RM weights for each exercise, and the app will automatically calculate the weights, change the sets,
            autobalance the T3 weights, and do all the math for you.
          </p>
        </div>
        <div className="w-64 mx-auto">
          <h3 className="text-lg font-bold leading-8 text-center">Muscle Balance</h3>
          <MusclesView title="Muscle Balance" settings={props.settings} points={points} hideListOfExercises={true} />
        </div>
      </div>
      <div className="w-32 h-px mx-auto my-8 b bg-grayv2-200" />
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
      <ProgramDetailsWorkoutPlayground program={props.program} settings={props.settings} />
      <div className="mt-8">
        <ProgramDetailsUpsell />
      </div>
    </section>
  );
}
