import { h, JSX } from "preact";
import { IProgram, IProgramState, ISettings } from "../../../types";
import { IAudioInterface } from "../../../lib/audioInterface";
import { ObjectUtils } from "../../../utils/object";
import { ProgramDetailsWorkoutPlayground } from "../programDetails/programDetailsWorkoutPlayground";
import { IconEditSquare } from "../../../components/icons/iconEditSquare";
import { IconCheckCircle } from "../../../components/icons/iconCheckCircle";
import { ProgramDetailsUpsell } from "../programDetails/programDetailsUpsell";
import { IPlaygroundDetailsWeekSetup } from "../programDetails/programDetailsWeekSetup";
import { Muscle } from "../../../models/muscle";
import { MusclesView } from "../../../components/muscles/musclesView";
import { ProgramDetailsGzclPrinciple } from "./programDetailsGzclPrinciple";
import { ProgramExercise } from "../../../models/programExercise";
import { Program } from "../../../models/program";
import { ProgramDetailsExerciseExample } from "../programDetails/programDetailsExerciseExample";
import { Weight } from "../../../models/weight";

export interface IProgramDetailsGzclUhf9wProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsGzclUhf9w(props: IProgramDetailsGzclUhf9wProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const weekSetup = buildWeekSetup(props.settings, program);
  const programForMuscles = ObjectUtils.clone(program);
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(programForMuscles, props.settings));

  const t1Exercise = props.program.exercises.find((pe) => pe.exerciseType.id === "squat")!;
  const t2Exercise = props.program.exercises.find((pe) => pe.exerciseType.id === "inclineBenchPress")!;
  const t3Exercise = props.program.exercises.find((pe) => pe.exerciseType.id === "bicepCurl")!;

  return (
    <section className="px-4">
      <h1 className="text-2xl font-bold leading-8 text-center">
        GZCL: UHF (Ultra High Frequency) 9 Weeks Program Explained
      </h1>
      <div className="mb-4 text-sm font-bold text-center">
        <a href="https://www.gainzfever.com/" target="_blank" className="underline text-bluev2">
          By Cody Lefever
        </a>
      </div>
      <div className="flex flex-col sm:flex-row program-details-description" style={{ gap: "1rem" }}>
        <div className="flex-1 min-w-0">
          <p>
            GZCL: UHF (Ultra High Frequency) is a weightlifting program based on the <strong>GZCL principle</strong>,
            created by{" "}
            <a href="https://www.gainzfever.com/" target="_blank">
              Cody Lefever
            </a>
            . The GZCL name comes from his Reddit username -{" "}
            <a href="https://www.reddit.com/u/gzcl" target="_blank">
              u/gzcl
            </a>
            . It's a program, that combines together GZCL principles and the Daily Undulated Periodization (DUP)
            principle. It's somewhat similar to{" "}
            <a href="/programs/gzcl-the-rippler" target="_blank">
              GZCL: The Rippler
            </a>{" "}
            , but The Rippler used week to week undulating while UFH sticks closer to the DUP principle and changes
            volume and intensity daily.
          </p>
          <p>
            Another difference is that The Rippler sticks to Upper/Lower days, while in UHF every day is pretty much
            full body (if T1 is Upper, T2 is Lower, and vice versa).
          </p>
          <p>The volume is also significantly higher, which makes it more of an advanced program.</p>
          <ProgramDetailsGzclPrinciple />
          <h2>Application of the GZCL Principle to the UHF program</h2>
          <h3>T1 Exercise</h3>
          <p>
            In the UHF program, we use the 2 rep max (2RM) weight as Training Max (TM). This is a{" "}
            <strong>9-week</strong> program, and each week we use different 2RM% weight and reps for various T1
            exercises. E.g. for week 1, we use 85% of 2RM weight for Squat, 75% for Deadlift, 90% for Sling Shot Bench
            Press, etc.
          </p>
          <p>
            Like in any Linear Periodization program, the weight generally goes up, while volume goes down. The weight
            goes up non-linearly though, but in the wave form, where each wave is 3 weeks.
          </p>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={props.program}
              programExercise={t1Exercise}
              settings={props.settings}
              weekSetup={weekSetup}
              weightInputs={[{ key: "tm", label: "Enter your TM weight" }]}
            />
          </div>
          <h3>T2 Exercise</h3>
          <p>
            Same as T1, we use 2RM weight for the TM. various T1 exercises. But unlike T1, we use linear increase of
            weight (non-wavy), and sorta wavy decrease of volume. The tops of the waves are mostly due to AMRAP (As Many
            Reps As Possible).
          </p>
          <p>
            For T2, We use "opposite" side for the exercise selection - if T1 is Upper, T2 is Lower, and vice versa. It
            sorta makes the UHF program technically a full body program.
          </p>
          <p>Week 9 is a deload week, so skip T2 exercise completely.</p>
          <p></p>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={props.program}
              programExercise={t2Exercise}
              settings={props.settings}
              weekSetup={weekSetup}
              weightInputs={[{ key: "tm", label: "Enter your TM weight" }]}
            />
          </div>
          <h3>T3 Exercise</h3>
          <p>
            For T3, the first set is a Rep Max set, where you have to work up to your Rep Max. For the first week it's
            15RM, for the second - 12RM, etc. So, to work up your 15RM, you need to guess your approximate 15RM weight,
            and then do "warmup" sets (3-4 of them), that are not fatiguing, slowly increasing the weight. Like, let's
            say you guessed your 15RM for EZBar Bicep Curl is 50lb. So, you do:
          </p>
          <ul>
            <li>5 reps with empty bar</li>
            <li>5 reps with 30lb</li>
            <li>3 reps with 40lb</li>
            <li>15 reps with 50lb</li>
          </ul>
          <p>
            If you missed, and chose the weight that is too heavy, and let's say you only could do 8 reps. Or too light,
            and you did 12 reps. That's okay! You'll get better at this later on, just record your weight/reps, and move
            to the Max Rep Sets.
          </p>
          <p>
            For Max Reps Sets, simply, try to do as many reps as possible with the same weight as you did for the first
            set (50lb in our case). For the 2nd, 3rd, etc Max Reps Set you likely will be able to do less and less reps,
            but that's okay and expected, as you're accumulating fatigue.
          </p>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={props.program}
              programExercise={t3Exercise}
              settings={props.settings}
              weekSetup={weekSetup}
              staticStateBuilder={(week, day, state) => {
                const weeksToRm = [15, 15, 12, 12, 10, 10, 8, 8, 0];
                return {
                  rm: Weight.getNRepMax(
                    Weight.build(60, props.settings.units),
                    weeksToRm[week - 1],
                    props.settings,
                    t3Exercise.exerciseType.equipment
                  ),
                };
              }}
              weightInputs={[]}
            />
          </div>
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
          <p>You can run GZCL: UHF 9 weeks program in the Liftosaur app.</p>
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
  for (let week = 1; week <= 9; week++) {
    const days = [];
    for (let day = 1; day <= 5; day++) {
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
      const dayData = Program.getDayData(program, dayIndex);
      const staticState: IProgramState = { week: week - 1 };
      const script = ProgramExercise.getFinishDayScript(exercise, program.exercises);
      const state = ProgramExercise.getState(exercise, program.exercises);
      const entry = Program.programExerciseToHistoryEntry(exercise, program.exercises, dayData, settings, { week });
      const newStaticState = Program.runExerciseFinishDayScript(
        entry,
        dayData,
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
