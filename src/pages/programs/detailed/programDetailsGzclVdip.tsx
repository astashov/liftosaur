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

export interface IProgramDetailsGzclVdipProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsGzclVdip(props: IProgramDetailsGzclVdipProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const programForMuscles = ObjectUtils.clone(program);
  const evaluatedProgram = Program.evaluate(programForMuscles, props.settings);
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(evaluatedProgram, props.settings));

  return (
    <section className="px-4">
      <h1 className="text-2xl font-bold leading-8 text-center">
        GZCL: VDIP (Volume-dependent Intensity Progression) Program Explained
      </h1>
      <div className="mb-4 text-sm font-bold text-center">
        <a href="https://www.gainzfever.com/" target="_blank" className="underline text-bluev2">
          By Cody Lefever
        </a>
      </div>
      <div className="flex flex-col sm:flex-row program-details-description" style={{ gap: "1rem" }}>
        <div className="flex-1 min-w-0">
          <p>
            GZCL: VDIP (Volume-dependent Intensity Progression) is a weightlifting program based on the{" "}
            <strong>GZCL principle</strong>, created by{" "}
            <a href="https://www.gainzfever.com/" target="_blank">
              Cody Lefever
            </a>
            . The GZCL name comes from his Reddit username -{" "}
            <a href="https://www.reddit.com/u/gzcl" target="_blank">
              u/gzcl
            </a>
            . It's a beginner-intermediate program, with the main idea is that each set is an AMRAP.
          </p>
          <ProgramDetailsGzclPrinciple />
          <h2>Application of the GZCL Principle to the VDIP program</h2>
          <h3>T1 Exercise</h3>
          <p>
            First, you come up with the initial weight - which is <strong>~85%</strong> of your 2RM for that exercise.
          </p>
          <p>
            There are <strong>3 sets</strong>, and every set of every exercise in this program is a Max Rep Set (or
            AMRAP - As Many Reps As Possible). You don't go to complete failure, but leave 1-2 reps in the tank, and do
            as many as you can. For the following sets, you will likely be able to do fewer and fewer reps, but that's
            okay. There's an autoregulating part of the program that will increase the weight by <strong>10lbs</strong>{" "}
            if the sum of all the reps is <strong>15</strong> or more, and by <strong>5lb</strong> if it's{" "}
            <strong>10</strong> or more.
          </p>
          <p>
            It's important to track the Rest Timer here, which should be <strong>3-5</strong> minutes for T1.
          </p>
          <h3>T2 Exercise</h3>
          <p>
            Similar to T1, but initial weight - <strong>~65%</strong> of your 2RM for that exercise (so you should be
            able to do more reps per set).
          </p>
          <p>
            It'll bump the weight by <strong>10lb</strong> if you got <strong>30</strong> or more total reps, and by{" "}
            <strong>5lb</strong> - if <strong>25</strong> or more total reps.
          </p>
          <p>
            The Rest Timer is smaller - <strong>2-3</strong> minutes for T2.
          </p>
          <h3>T3 Exercise</h3>
          <p>
            All the same as in T1/T2, but <strong>4 sets</strong>. Initial weight - <strong>~55%</strong> of your 2RM
            for that exercise.
          </p>
          <p>
            It'll increase the weight by <strong>5lb</strong> if you got <strong>50</strong> reps or more total.
          </p>
          <p>
            The Rest Timer is even smaller - <strong>30-90</strong> seconds for T3.
          </p>
          <p>
            Again, this is just a brief description, and for full information and details, please read the{" "}
            <a
              href="http://swoleateveryheight.blogspot.com/2016/11/volume-dependent-intensity-progression.html"
              target="_blank"
            >
              original post with the GZCL VDIP application
            </a>
            .
          </p>
          <p>
            Check the interactive playground below to see how the program works, and what the weights/sets/reps look
            like for each day. You can finish the sets, and see how the weight would be changed for the next workout.
          </p>
          <p>You can run GZCL: VDIP program in the Liftosaur app.</p>
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
