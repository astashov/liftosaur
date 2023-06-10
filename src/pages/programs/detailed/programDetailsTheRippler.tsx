import { h, JSX } from "preact";
import { IProgram, IProgramState, ISettings } from "../../../types";
import { IAudioInterface } from "../../../lib/audioInterface";
import { ObjectUtils } from "../../../utils/object";
import { ProgramDetailsWorkoutPlayground } from "../programDetails/programDetailsWorkoutPlayground";
import { IconEditSquare } from "../../../components/icons/iconEditSquare";
import { IconCheckCircle } from "../../../components/icons/iconCheckCircle";
import { ProgramDetailsUpsell } from "../programDetails/programDetailsUpsell";
import { Program } from "../../../models/program";
import { ProgramExercise } from "../../../models/programExercise";
import { ExerciseImage } from "../../../components/exerciseImage";
import { ProgramDetailsExerciseExample } from "../programDetails/programDetailsExerciseExample";
import { IPlaygroundDetailsWeekSetup } from "../programDetails/programDetailsWeekSetup";
import { Muscle } from "../../../models/muscle";
import { MusclesView } from "../../../components/muscles/musclesView";

export interface IProgramDetailsTheRipplerProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsTheRippler(props: IProgramDetailsTheRipplerProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const weekSetup = buildWeekSetup(props.settings, program);
  const programForMuscles = ObjectUtils.clone(program);
  const t3Exercises = programForMuscles.exercises.filter((e) => /(T3a|T3b)/.test(e.description || ""));
  for (const exercise of t3Exercises) {
    for (const variation of exercise.variations) {
      for (const sets of variation.sets) {
        sets.repsExpr = "10";
      }
    }
  }
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(programForMuscles, props.settings));
  const t1Pct = [85, 90, 87.5, 92.5, 90, 95, 92.5, 97.5, 95, 100, 90];
  const t2Pct = [80, 85, 90, 82.5, 87.5, 92.5, 85, 90, 95, 100];

  return (
    <section className="px-4">
      <h1 className="mb-4 text-2xl font-bold leading-8 text-center">GZCL: The Rippler program explained</h1>
      <div className="flex flex-col sm:flex-row program-details-description" style={{ gap: "1rem" }}>
        <div className="flex-1 min-w-0">
          <p>
            The Rippler is a weightlifting program based on the <strong>GZCL principle</strong>, created by{" "}
            <a href="https://www.gainzfever.com/" target="_blank">
              Cody Lefever
            </a>
            . The GZCL name comes from his Reddit username -{" "}
            <a href="https://www.reddit.com/u/gzcl" target="_blank">
              u/gzcl
            </a>
            . This program is an excellent next step following the beginner{" "}
            <a href="/programs/gzclp" target="_blank">
              GZCLP
            </a>{" "}
            program, particularly when your newbie gains have plateaued and you can't increase your weights as quickly.
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
          <h2>Application of the GZCL Principle to The Rippler Program</h2>
          <p>
            In The Rippler program, we use the 2 rep max (2RM) weight as a basis. This is a <strong>12-week</strong>{" "}
            program, where the weight for T1 and T2 exercises changes each week according to a specific pattern.
          </p>
          <p>
            For <strong>T1 exercises</strong>, we increase the weight for 2 weeks, then slightly decrease it, and
            increase it even more in week 4. This pattern repeats through 4-week blocks. We'll have three 4-week blocks.
            We use 2 rep max (2RM) as a base weight for T1 exercises. So, for first 4 weeks we do 85%, 87.5%, 90%, 92.5%
            of 2RM weight.
          </p>
          <h3>Example of a T1 exercise sets/reps/weight week over week</h3>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={props.program}
              programExercise={props.program.exercises.find((pe) => pe.exerciseType.id === "benchPress")!}
              settings={props.settings}
              weekSetup={weekSetup.slice(0, 11).map((w, i) => ({ ...w, name: `${w.name} (${t1Pct[i]}%)` }))}
              weightInputs={[{ key: "rm2", label: "Enter your 2RM weight" }]}
            />
          </div>
          <p>
            For <strong>T2 exercises</strong>, we gradually increase the weights over 3 weeks (e.g., 80%, 85%, 90%),
            then reset to 82.5%, and increase again (82.5%, 87.5%, 92.5%). We repeat this pattern over four 3-week
            blocks, creating a wave-like pattern. We use 5 rep max (5RM) as a base weight for T2 exercises. We skip T2
            exercises completely on weeks 11 and 12.
          </p>
          <h3>Example of a T2 exercise sets/reps/weight week over week</h3>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={props.program}
              programExercise={props.program.exercises.find((pe) => pe.exerciseType.id === "inclineBenchPress")!}
              settings={props.settings}
              weekSetup={weekSetup.slice(0, 10).map((w, i) => ({ ...w, name: `${w.name} (${t2Pct[i]}%)` }))}
              weightInputs={[{ key: "rm5", label: "Enter your 5RM weight" }]}
            />
          </div>
          <p>
            For <strong>T3 exercises</strong>, we don't vary the weight, but aim to do the maximum reps each time. Start
            with a weight you can lift for 10 reps, then do as many reps as you can, leaving 1-2 reps in reserve. It's
            better to err on the side of lighter weights. If the weight you choose is too light, the Liftosaur app will
            automatically adjust and increase the weight as needed in weeks 3, 6, and 9.
          </p>
          <p>
            Feel free to substitute exercises if you don't have the necessary equipment or if you wish to target
            specific muscles, particularly for the T3 exercises. If you use the Liftosaur app, there's a handy
            "Substitute" exercise feature where you can select similar exercises that require different equipment.
          </p>
          <h2>1RM test</h2>
          <p>
            Starting from week 11, you'll begin preparing for the 1RM test. You won't do T2 and T3 exercises at all
            during this period. On week 11, you will do heavy 2RMs of T1, and on week 12, you'll test your 1RM, and
            enjoy your new PRs!
          </p>
          <p>
            Again, this is just a short description, and for full information and details, please read the{" "}
            <a href="http://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html" target="_blank">
              original post with the GZCL applications
            </a>
            .
          </p>
          <p>
            Check the interactive playground below to see how the program works, and what the weights/sets/reps look
            like for each week. You can edit the 2RM, 5RM, etc weights for each exercise, and see how the weight
            changes.
          </p>
          <p>
            You can run GZCL: The Rippler program in the Liftosaur app. You only would need to set initial RM weights
            for each exercise, and the app will automatically calculate the weights, change the sets, autobalance the T3
            weights, and do all the math for you.
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

function buildWeekSetup(settings: ISettings, program: IProgram): IPlaygroundDetailsWeekSetup[] {
  const weekSetup: IPlaygroundDetailsWeekSetup[] = [];
  for (let week = 1; week <= 12; week++) {
    const days = [];
    for (let day = 1; day <= 4; day++) {
      days.push({ dayIndex: day, states: buildStaticStates(settings, program, day, week) });
    }
    weekSetup.push({ name: `Week ${week}`, days });
  }
  return weekSetup;
}

function buildStaticStates(
  settings: ISettings,
  program: IProgram,
  dayIndex: number,
  week: number
): Partial<Record<string, IProgramState>> {
  const day = program.days[dayIndex - 1];

  return program.exercises.reduce<Partial<Record<string, IProgramState>>>((acc, exercise) => {
    if (day.exercises.map((e) => e.id).indexOf(exercise.id) !== -1) {
      const staticState: IProgramState = { week: week - 1 };
      const script = ProgramExercise.getFinishDayScript(exercise, program.exercises);
      const state = ProgramExercise.getState(exercise, program.exercises);
      const entry = Program.programExerciseToHistoryEntry(exercise, program.exercises, dayIndex, settings, { week });
      const newStaticState = Program.runExerciseFinishDayScript(
        entry,
        dayIndex,
        settings,
        state,
        script,
        entry.exercise.equipment,
        staticState
      );
      if (newStaticState.success) {
        for (const key of ["reps", "intensity"]) {
          if (state[key] != null) {
            staticState[key] = newStaticState.data[key];
          }
        }
        staticState.week = week;
      }

      acc[exercise.id] = staticState;
    }
    return acc;
  }, {});
}
