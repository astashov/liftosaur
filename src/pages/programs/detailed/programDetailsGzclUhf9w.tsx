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
import { ProgramDetailsExerciseExample } from "../programDetails/programDetailsExerciseExample";
import { ProgramDetailsWorkoutPlayground } from "../programDetails/programDetailsWorkoutPlayground";
import { Program } from "../../../models/program";

export interface IProgramDetailsGzclUhf9wProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsGzclUhf9w(props: IProgramDetailsGzclUhf9wProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const programForMuscles = ObjectUtils.clone(program);
  const evaluatedProgram = Program.evaluate(programForMuscles, props.settings);
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(evaluatedProgram, props.settings));

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
            . It's a program that combines GZCL principles and the Daily Undulated Periodization (DUP) principle. It's
            somewhat similar to{" "}
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
            As in any Linear Periodization program, the weight generally goes up, while volume goes down. The weight
            goes up non-linearly though, but in the wave form, where each wave is 3 weeks.
          </p>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={evaluatedProgram}
              programExerciseKey="t1-squat"
              exerciseType={{ id: "squat", equipment: "barbell" }}
              settings={props.settings}
            />
          </div>
          <h3>T2 Exercise</h3>
          <p>
            Same as T1, we use a 2RM weight for the TM and various T1 exercises. But unlike T1, we use a linear increase
            in weight (non-wavy) and a somewhat wavy decrease in volume. The peaks of the waves are mostly due to AMRAP
            (As Many Reps As Possible) sets.
          </p>
          <p>
            For T2, we use the 'opposite' side for exercise selection - if T1 is Upper, T2 is Lower, and vice versa.
            This sort of makes the UHF program technically a full-body program.
          </p>
          <p>Week 9 is a deload week, so skip the T2 exercise completely.</p>
          <p></p>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={evaluatedProgram}
              settings={props.settings}
              programExerciseKey="t2-incline bench press"
              exerciseType={{ id: "inclineBenchPress", equipment: "barbell" }}
              weekSetup={evaluatedProgram.weeks.slice(0, 8).map((w) => ({ name: w.name }))}
            />
          </div>
          <h3>T3 Exercise</h3>
          <p>
            For T3, the first set is a Rep Max set, where you work up to your Rep Max. For the first week, it's a 15RM,
            for the second week, it's a 12RM, and so on. To work up to your 15RM, you need to estimate your approximate
            15RM weight and then perform 'warm-up' sets (3-4 of them) that are not fatiguing, gradually increasing the
            weight. For example, let's say you estimated your 15RM for EZBar Bicep Curl is 50lb. So, you would do:
          </p>
          <ul>
            <li>5 reps with an empty bar</li>
            <li>5 reps with 30lb</li>
            <li>3 reps with 40lb</li>
            <li>and 15 reps with 50lb.</li>
          </ul>
          <p>
            If you missed and chose a weight that is too heavy, let's say you could only do 8 reps, or if it was too
            light and you did 12 reps, that's okay! You'll improve over time, so just record the weight and reps, and
            move on to the Max Rep Sets.
          </p>
          <p>
            For the Max Rep Sets, simply try to do as many reps as possible with the same weight as the first set (50lb
            in our case). For the second, third, and so on, Max Reps Sets, you will likely be able to do fewer and fewer
            reps, but that's okay and expected as you accumulate fatigue.
          </p>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={evaluatedProgram}
              settings={props.settings}
              programExerciseKey="t3-bicep curl"
              exerciseType={{ id: "bicepCurl", equipment: "dumbbell" }}
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
          <p>You can run the GZCL: UHF 9 weeks program in the Liftosaur app.</p>
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
