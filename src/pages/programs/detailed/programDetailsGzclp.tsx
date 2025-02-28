import { h, JSX } from "preact";
import { IProgram, ISettings } from "../../../types";
import { IAudioInterface } from "../../../lib/audioInterface";
import { ObjectUtils } from "../../../utils/object";
import { IconEditSquare } from "../../../components/icons/iconEditSquare";
import { IconCheckCircle } from "../../../components/icons/iconCheckCircle";
import { ProgramDetailsUpsell } from "../programDetails/programDetailsUpsell";
import { ExerciseImage } from "../../../components/exerciseImage";
import { Muscle } from "../../../models/muscle";
import { MusclesView } from "../../../components/muscles/musclesView";
import { ProgramDetailsGzclPrinciple } from "./programDetailsGzclPrinciple";
import { ProgramDetailsWorkoutPlayground } from "../programDetails/programDetailsWorkoutPlayground";
import { Program } from "../../../models/program";

export interface IProgramDetailsGzclpProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsGzclp(props: IProgramDetailsGzclpProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const evaluatedProgram = Program.evaluate(program, props.settings);
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(evaluatedProgram, props.settings));

  return (
    <section className="px-4">
      <h1 className="text-2xl font-bold leading-8 text-center">GZCLP Program Explained</h1>
      <div className="mb-4 text-sm font-bold text-center">
        <a href="https://www.gainzfever.com/" target="_blank" className="underline text-bluev2">
          By Cody Lefever
        </a>
      </div>
      <div className="flex flex-col sm:flex-row program-details-description" style={{ gap: "1rem" }}>
        <div className="flex-1 min-w-0">
          <p>
            GZCLP is a weightlifting program based on the <strong>GZCL principle</strong>, created by{" "}
            <a href="https://www.gainzfever.com/" target="_blank">
              Cody Lefever
            </a>
            . The GZCL name comes from his Reddit username -{" "}
            <a href="https://www.reddit.com/u/gzcl" target="_blank">
              u/gzcl
            </a>{" "}
            It's a great beginner program. You do it three times a week and it's based on something called the GZCL
            principle. It's a good next step after doing 3-6 months of a Basic Beginner Routine or Starting Strength.
            It's also good for getting a lot of practice with exercises, because you do more reps than most other
            beginner programs.
          </p>
          <ProgramDetailsGzclPrinciple />
          <h2>Application of the GZCL Principle to GZCLP program</h2>
          <p>
            The GZCLP program has three workouts per week, but it's comprised of four different days - A1, A2, B1, and
            B2. So, you might do A1 on Monday, A2 on Wednesday, B1 on Friday, and then start the next week with B2 on
            Monday. You keep rotating through these workouts.
          </p>
          <p>
            For <strong>T1 exercises</strong>, we utilize main lifts:
            <strong>
              <ExerciseImage
                settings={props.settings}
                className="w-6"
                exerciseType={{ id: "squat", equipment: "barbell" }}
                size="small"
              />{" "}
              Squat,{" "}
              <ExerciseImage
                settings={props.settings}
                className="w-6"
                exerciseType={{ id: "deadlift", equipment: "barbell" }}
                size="small"
              />{" "}
              Deadlift,{" "}
              <ExerciseImage
                settings={props.settings}
                className="w-6"
                exerciseType={{ id: "benchPress", equipment: "barbell" }}
                size="small"
              />{" "}
              Bench Press,{" "}
              <ExerciseImage
                className="w-6"
                settings={props.settings}
                exerciseType={{ id: "overheadPress", equipment: "barbell" }}
                size="small"
              />{" "}
              Overhead Press{" "}
            </strong>
            . You start with 5 sets of 3 reps. The last rep should be as many as you can do (AMRAP), but{" "}
            <strong>don't push to total exhaustion</strong>. Stop when you feel you have <strong>1-2 reps</strong> left.
            You'll know you're close to your limit when the bar gets much slower, or your form starts to go wrong.
          </p>
          <p>
            If you manage to finish all sets, you add <strong>5lb</strong> to the Bench Press and Overhead Press, and{" "}
            <strong>10lb</strong> to the Squat and Deadlift. If you can't finish, you keep the weight the same, but move
            on to "Stage 2" - 6 sets of 2 reps. You keep adding weight following the same rules. If you still can't
            finish - you move to "Stage 3" - 10 sets of 1 rep.
          </p>
          <p>
            If you can't manage "Stage 3", you either establish your new 5 reps max (5RM) and use that to restart "Stage
            1", or you reduce your current weight by 10% and revert to "Stage 1".
          </p>
          <p>So, to summarize:</p>
          <ul>
            <li>
              <strong>Stage 1</strong> - 5 sets of 3 reps, AMRAP on the last set
            </li>
            <li>
              <strong>Stage 2</strong> - 6 sets of 2 reps, AMRAP on the last set
            </li>
            <li>
              <strong>Stage 3</strong> - 10 sets of 1 rep, AMRAP on the last set
            </li>
          </ul>
          <p>
            For <strong>T2 exercises</strong>, we also do the same main lifts as in T1:
            <strong>
              <ExerciseImage
                settings={props.settings}
                className="w-6"
                exerciseType={{ id: "squat", equipment: "barbell" }}
                size="small"
              />{" "}
              Squat,{" "}
              <ExerciseImage
                settings={props.settings}
                className="w-6"
                exerciseType={{ id: "deadlift", equipment: "barbell" }}
                size="small"
              />{" "}
              Deadlift,{" "}
              <ExerciseImage
                settings={props.settings}
                className="w-6"
                exerciseType={{ id: "benchPress", equipment: "barbell" }}
                size="small"
              />{" "}
              Bench Press,{" "}
              <ExerciseImage
                settings={props.settings}
                className="w-6"
                exerciseType={{ id: "overheadPress", equipment: "barbell" }}
                size="small"
              />{" "}
              Overhead Press{" "}
            </strong>
            . When you're doing Squats as T1 exercise, you do Bench Press as T2. When Bench Press is T1, Squat is T2.
            You flip flop the T1 and T2.
          </p>
          <p>
            There are also 3 stages in T2, but you don't do AMRAP on the last set. You use the same progression rules as
            in T1 - if you successfully finish all sets, you increase the weight by <strong>5lb</strong> for Bench Press
            and Overhead Press, and by <strong>10lb</strong> for Squat and Deadlift. If you couldn't finish all sets,
            you switch to the next stage.
          </p>
          <p>There're the following stages:</p>
          <ul>
            <li>
              <strong>Stage 1</strong> - 3 sets of 10 reps, no AMRAP
            </li>
            <li>
              <strong>Stage 2</strong> - 3 sets of 8 reps, no AMRAP
            </li>
            <li>
              <strong>Stage 3</strong> - 3 sets of 6 reps, no AMRAP
            </li>
          </ul>
          <p>
            If you fail "Stage 3", you revert to your last weight from "Stage 1", add 15lb to it, and transition back to
            "Stage 1".
          </p>
          <p>
            For the <strong>T3 exercises</strong>, we use
            <strong>
              <ExerciseImage
                settings={props.settings}
                className="w-6"
                exerciseType={{ id: "latPulldown", equipment: "cable" }}
                size="small"
              />{" "}
              Lat Pulldown, and{" "}
              <ExerciseImage
                settings={props.settings}
                className="w-6"
                exerciseType={{ id: "bentOverRow", equipment: "dumbbell" }}
                size="small"
              />{" "}
              Dumbbell Bent Over Row
            </strong>
          </p>
          <p>There are no stages, just do 3 sets of 15 reps, with AMRAP as a last set.</p>
          <p>Once you can do 25 reps or more - add 5lb to the weight.</p>
          <p>
            Again, this is a brief overview. For comprehensive information and details, please read the{" "}
            <a
              href="https://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html"
              target="_blank"
            >
              original post with the GZCL applications
            </a>
            .
          </p>
          <p>
            Check the interactive playground below to see how the program works. Try to complete different reps and see
            how it updates the weights, or switches to different stages for T1 and T2 exercises. You can adjust your
            weights by clicking on the <IconEditSquare className="inline-block" /> icon.
          </p>
          <p>You can run the GZCLP program in the Liftosaur app.</p>
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
