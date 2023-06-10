import { h, JSX } from "preact";
import { IProgram, ISettings } from "../../../types";
import { IAudioInterface } from "../../../lib/audioInterface";
import { ObjectUtils } from "../../../utils/object";
import { ProgramDetailsWorkoutPlayground } from "../programDetails/programDetailsWorkoutPlayground";
import { IconEditSquare } from "../../../components/icons/iconEditSquare";
import { IconCheckCircle } from "../../../components/icons/iconCheckCircle";
import { ProgramDetailsUpsell } from "../programDetails/programDetailsUpsell";
import { ExerciseImage } from "../../../components/exerciseImage";
import { Muscle } from "../../../models/muscle";
import { MusclesView } from "../../../components/muscles/musclesView";
import { IPlaygroundDetailsWeekSetup } from "../programDetails/programDetailsWeekSetup";

export interface IProgramDetailsGzclpProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsGzclp(props: IProgramDetailsGzclpProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const weekSetup = buildWeekSetup();
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(program, props.settings));

  return (
    <section className="px-4">
      <h1 className="mb-4 text-2xl font-bold leading-8 text-center">GZCLP program explained</h1>
      <div className="flex flex-col sm:flex-row program-details-description" style={{ gap: "1rem" }}>
        <div className="flex-1 min-w-0">
          <p>
            GZCLP is a weightlifting program that's great for beginners. You do it three times a week and it's based on
            something called the GZCL principle. It's a good next step after doing 3-6 months of a Basic Beginner
            Routine or Starting Strength. It's also good for getting a lot of practice with exercises, because you do
            more reps than most other beginner programs.
          </p>
          <h2>GZCL principle</h2>
          <p>Before diving in, here are some basic terminologies:</p>
          <ul>
            <li>
              <strong>Rep Max</strong>: This refers to the maximum weight you can lift for a given number of reps. For
              instance, if you can do 5 reps (and no more) with 100 kg, then your 5 rep max is 100 kg. When measuring
              this, you should not go to full failure, but stop when you can't maintain good form for another rep.
            </li>
          </ul>
          <p>
            Now, let's talk about exercises. Exercises in GZCL programs are split into <strong>3 tiers</strong>:
          </p>
          <ul>
            <li>
              <strong>T1</strong>: These are main compound exercises (e.g.,{" "}
              <strong>
                <ExerciseImage className="w-6" exerciseType={{ id: "squat", equipment: "barbell" }} size="small" />{" "}
                Squat,{" "}
                <ExerciseImage className="w-6" exerciseType={{ id: "deadlift", equipment: "barbell" }} size="small" />{" "}
                Deadlift,{" "}
                <ExerciseImage className="w-6" exerciseType={{ id: "benchPress", equipment: "barbell" }} size="small" />{" "}
                Bench Press,{" "}
                <ExerciseImage
                  className="w-6"
                  exerciseType={{ id: "overheadPress", equipment: "barbell" }}
                  size="small"
                />{" "}
                Overhead Press{" "}
              </strong>
              ). These exercises involve the highest intensity (i.e., the largest weights, about{" "}
              <strong>85-100%</strong> of your 2-3 rep max), but with lower volume (fewer reps and sets). Typically, you
              will perform 10-15 total reps, usually within <strong>1-3 reps</strong> per set.
            </li>
            <li>
              <strong>T2</strong>: These are secondary compound exercises (e.g.,{" "}
              <strong>
                <ExerciseImage className="w-6" exerciseType={{ id: "frontSquat", equipment: "barbell" }} size="small" />{" "}
                Front Squat,{" "}
                <ExerciseImage
                  className="w-6"
                  exerciseType={{ id: "romanianDeadlift", equipment: "barbell" }}
                  size="small"
                />{" "}
                Romanian Deadlift,{" "}
                <ExerciseImage
                  className="w-6"
                  exerciseType={{ id: "inclineBenchPress", equipment: "barbell" }}
                  size="small"
                />{" "}
                Incline Bench Press
              </strong>
              , etc). These exercises have less intensity (lower weights), but higher volume (more reps and sets). You
              should pick exercises that will assist with your T1 exercises. For example, if you want to improve your{" "}
              <strong>Squat</strong>, you could do <strong>Front Squats</strong> as a T2 exercise. These exercises are
              performed with <strong>65-85%</strong> of your 2-3 rep max, usually within <strong>5-8 reps</strong> per
              set.
            </li>
            <li>
              <strong>T3</strong>: These are isolation exercises (e.g.,{" "}
              <strong>
                <ExerciseImage
                  className="w-6"
                  exerciseType={{ id: "legPress", equipment: "leverageMachine" }}
                  size="small"
                />{" "}
                Leg Press,{" "}
                <ExerciseImage
                  className="w-6"
                  exerciseType={{ id: "seatedLegCurl", equipment: "leverageMachine" }}
                  size="small"
                />{" "}
                Leg Curl,
                <ExerciseImage
                  className="w-6"
                  exerciseType={{ id: "tricepsExtension", equipment: "dumbbell" }}
                  size="small"
                />{" "}
                Triceps Extension,
                <ExerciseImage
                  className="w-6"
                  exerciseType={{ id: "lateralRaise", equipment: "dumbbell" }}
                  size="small"
                />{" "}
                Lateral Raise
              </strong>
              ). These exercises have the lowest intensity (lightest weights), but highest volume (most reps and sets).
              The goal is to choose exercises that will assist with your T1 and T2 exercises. These are performed with
              less than <strong>65%</strong> of your 2-3 rep max, usually with <strong>8 or more reps</strong> per set.
            </li>
          </ul>
          <p>
            A useful rule of thumb is the <strong>1:2:3 rule</strong> - for every rep you perform in T1, do 2 reps in
            T2, and 3 in T3.
          </p>
          <p>
            This is a very short description of the GZCL principle. For more information, and more details, I REALLY
            recommend to read{" "}
            <a
              href="http://swoleateveryheight.blogspot.com/2012/11/the-gzcl-method-for-powerlifting.html"
              target="_blank"
            >
              Cody's blogpost
            </a>
            .
          </p>
          <h2>Application of the GZCL Principle to GZCLP program</h2>
          <p>
            The GZCLP program has three workouts per week, but it's made up of four different days - A1, A2, B1, and B2.
            So, you might do A1 on Monday, A2 on Wednesday, B1 on Friday, and then start the next week with B2 on
            Monday. You keep rotating through these workouts.
          </p>
          <p>
            For <strong>T1 exercises</strong>, we use main lifts:
            <strong>
              <ExerciseImage className="w-6" exerciseType={{ id: "squat", equipment: "barbell" }} size="small" /> Squat,{" "}
              <ExerciseImage className="w-6" exerciseType={{ id: "deadlift", equipment: "barbell" }} size="small" />{" "}
              Deadlift,{" "}
              <ExerciseImage className="w-6" exerciseType={{ id: "benchPress", equipment: "barbell" }} size="small" />{" "}
              Bench Press,{" "}
              <ExerciseImage
                className="w-6"
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
            If you can't manage "Stage 3" you either find out your new 5 reps max (5RM) and use that to start "Stage 1"
            again, or you take off 10% of your current weight and go back to "Stage 1".
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
              <ExerciseImage className="w-6" exerciseType={{ id: "squat", equipment: "barbell" }} size="small" /> Squat,{" "}
              <ExerciseImage className="w-6" exerciseType={{ id: "deadlift", equipment: "barbell" }} size="small" />{" "}
              Deadlift,{" "}
              <ExerciseImage className="w-6" exerciseType={{ id: "benchPress", equipment: "barbell" }} size="small" />{" "}
              Bench Press,{" "}
              <ExerciseImage
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
            There're also 3 stages in T2, but you don't do AMRAP on the last set. You use the same progression rules as
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
          <p>If you fail "Stage 3", you use your last weight of "Stage 1", add 15lb to it, and switch to "Stage 1".</p>
          <p>
            For the <strong>T3 exercises</strong>, we use
            <strong>
              <ExerciseImage className="w-6" exerciseType={{ id: "latPulldown", equipment: "cable" }} size="small" />{" "}
              Lat Pulldown, and{" "}
              <ExerciseImage className="w-6" exerciseType={{ id: "bentOverRow", equipment: "dumbbell" }} size="small" />{" "}
              Dumbbell Bent Over Row
            </strong>
          </p>
          <p>There're no stages, just do 3 sets of 15 reps, with AMRAP as a last set.</p>
          <p>Once you can do 25 reps or more - add 5lb to the weight.</p>
          <p>
            Again, this is just a short description, and for full information and details, please read the{" "}
            <a href="http://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html" target="_blank">
              original post with the GZCL applications
            </a>
            .
          </p>
          <p>
            Check the interactive playground below to see how the program works. Try to complete different reps and see
            how it updates the weights, or switches to different stages for T1 and T2 exercises. You can set your
            weights there by clicking on the <IconEditSquare className="inline-block" /> icon.
          </p>
          <p>You can run GZCLP program in the Liftosaur app.</p>
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
      <ProgramDetailsWorkoutPlayground
        program={props.program}
        settings={props.settings}
        client={props.client}
        weekSetup={weekSetup}
      />
      <div className="mt-8">
        <ProgramDetailsUpsell />
      </div>
    </section>
  );
}

function buildWeekSetup(): IPlaygroundDetailsWeekSetup[] {
  const days = [];
  for (let day = 1; day <= 4; day++) {
    days.push({ dayIndex: day, states: {} });
  }
  return [
    {
      name: "Week 1",
      days,
    },
  ];
}
