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

export function ProgramDetailsGzclGeneralGainz(props: IProgramDetailsGzclVdipProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const programForMuscles = ObjectUtils.clone(program);
  const evaluatedProgram = Program.evaluate(programForMuscles, props.settings);
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(evaluatedProgram, props.settings));

  return (
    <section className="px-4">
      <h1 className="text-2xl font-bold leading-8 text-center">GZCL: General Gainz Program Explained</h1>
      <div className="mb-4 text-sm font-bold text-center">
        <a href="https://www.gainzfever.com/" target="_blank" className="underline text-bluev2">
          By Cody Lefever
        </a>
      </div>
      <div className="flex flex-col sm:flex-row program-details-description" style={{ gap: "1rem" }}>
        <div className="flex-1 min-w-0">
          <p>
            GZCL: General Gainz is a weightlifting program based on the <strong>GZCL principle</strong>, created by{" "}
            <a href="https://www.gainzfever.com/" target="_blank">
              Cody Lefever
            </a>
            . The GZCL name comes from his Reddit username -{" "}
            <a href="https://www.reddit.com/u/gzcl" target="_blank">
              u/gzcl
            </a>
            . It's the newest program from Cody, combining the learnings from all other GZCL programs, from{" "}
            <a href="/programs/gzcl-vdip" target="_blank">
              VDIP
            </a>{" "}
            and{" "}
            <a href="/programs/gzclp" target="_blank">
              GZCLP
            </a>{" "}
            to{" "}
            <a href="/programs/gzcl-jacked-and-tan-2" target="_blank">
              Jacked &amp; Tan 2.0.
            </a>
            .
          </p>
          <ProgramDetailsGzclPrinciple />
          <h2>Application of the GZCL Principle to the General Gainz program</h2>
          <h3>T1 Exercises</h3>
          <p>The progression is based on 4 actions:</p>
          <ul>
            <li>
              <strong>Find</strong>: you pick a weight you can do for 3-6 reps (3RM-6RM), make an attempt, and estimate
              it's complexity. Whether it was easy (RPE 8 - 2 reps in the tank), medium (RPE 9 - 1 rep in the tank), or
              hard - (RPE 10 - no reps in the tank).
            </li>
            <li>
              <strong>Hold</strong>: next time you try to do the <strong>same reps with same weight</strong> (e.g., for
              a second chance).
            </li>
            <li>
              <strong>Push</strong>: next time you try to do <strong>more reps with same weight</strong>, push your
              limits.
            </li>
            <li>
              <strong>Extend</strong>: Do <strong>1-rep sets</strong> after the first 3-6 RM set. The number of sets
              matches your first RM set. For example, if you did a 5RM, you do 5 additional 1-rep sets with the same
              weight. You can extend the number of sets up to an additional 3 sets if the first set was easy or medium.
            </li>
          </ul>
          <p>
            So, initially you do <strong>Find</strong> and <strong>Extend</strong>. In the next workouts, you make a
            decision - either <strong>Hold</strong> or <strong>Push</strong>, and after that - <strong>Extend</strong>{" "}
            again.
          </p>
          <p>Once you get to 6RM + 6 sets, you can increase the weight.</p>
          <p>
            Rest time is important; otherwise, you can pretty much do the extension sets forever. <strong>3-5</strong>{" "}
            minutes after first set, and <strong>2-3</strong> minutes after extension sets.
          </p>
          <h3>T2 Exercises</h3>
          <p>Pretty similar to T1 - also have 4 actions with the same meaning:</p>
          <ul>
            <li>
              <strong>Find</strong>: you pick a weight you can do for 6-10 reps (6RM-10RM), make an attempt, and
              estimate it's complexity. Whether it was easy (RPE 8 - 2 reps in the tank), medium (RPE 9 - 1 rep in the
              tank) or hard - (RPE 10 - no reps in the tank).
            </li>
            <li>
              <strong>Hold</strong>: next time you try to do the <strong>same reps with same weight</strong> (e.g., for
              a second chance).
            </li>
            <li>
              <strong>Push</strong>: next time you try to do <strong>more reps with same weight</strong>, push your
              limits.
            </li>
            <li>
              <strong>Extend</strong>: Do <strong>half-sets</strong> after the first 6-10 RM set. Your goal is to get 2
              times of the reps from the first set, doing sets with half reps of your first set. For example if you did
              10RM first set, you want to get <strong>20 reps</strong> total in the extension sets. So, you do{" "}
              <strong>4 sets of 5 reps</strong> (5 = 10 / 2). You can extend the number of sets up to an additional{" "}
              <strong>2 sets</strong> if the first set was easy or medium.
            </li>
          </ul>
          <p>Once you get to 10RM + all extension sets, you can increase the weight.</p>
          <p>
            Rest time is important here too. Rest for <strong>2-4</strong> minutes after the first set, and{" "}
            <strong>1-2</strong> minutes after extension sets.
          </p>
          <h3>T3 Exercises</h3>
          <p>
            T3 exercises consist of just 3 sets of AMRAP (or Max Rep Sets - MRS). Keep short rest times between them -{" "}
            <strong>30-90 seconds</strong>.
          </p>
          <p>
            Again, this is just a brief description, and for full information and details, please read the{" "}
            <a href="https://www.reddit.com/r/gzcl/comments/aqkdgo/happy_gday_gainerz/" target="_blank">
              original post on Reddit with the GZCL General Gainz application
            </a>
            .
          </p>
          <p>
            Check the interactive playground below to see how the program works, and what the weights/sets/reps look
            like for each day. You can simulate doing RM, and then singles or half-sets after, etc.
          </p>
          <p>You can run the GZCL: General Gainz program in the Liftosaur app.</p>
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
