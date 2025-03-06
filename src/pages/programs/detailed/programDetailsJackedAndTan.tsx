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
import { PP } from "../../../models/pp";

export interface IProgramDetailsJackedAndTanProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsJackedAndTan(props: IProgramDetailsJackedAndTanProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const programForMuscles = ObjectUtils.clone(program);
  const evaluatedProgram = Program.evaluate(programForMuscles, props.settings);
  PP.iterate2(evaluatedProgram.weeks, (exercise) => {
    if (exercise.descriptions.values.some((d) => /(T3|T2b)/.test(d.value))) {
      for (const setVariation of exercise.evaluatedSetVariations) {
        for (const set of setVariation.sets) {
          set.maxrep = 10;
        }
      }
    }
  });

  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(evaluatedProgram, props.settings));

  return (
    <section className="px-4">
      <h1 className="text-2xl font-bold leading-8 text-center">GZCL: Jacked And Tan 2.0 Program Explained</h1>
      <div className="mb-4 text-sm font-bold text-center">
        <a href="https://www.gainzfever.com/" target="_blank" className="underline text-bluev2">
          By Cody Lefever
        </a>
      </div>
      <div className="flex flex-col sm:flex-row program-details-description" style={{ gap: "1rem" }}>
        <div className="flex-1 min-w-0">
          <p>
            Jacked &amp; Tan 2.0 is a weightlifting program based on the <strong>GZCL principle</strong>, created by{" "}
            <a href="https://www.gainzfever.com/" target="_blank">
              Cody Lefever
            </a>
            . The GZCL name comes from his Reddit username -{" "}
            <a href="https://www.reddit.com/u/gzcl" target="_blank">
              u/gzcl
            </a>
            . It's a 12-week weightlifting program, following GZCL principles, and offering quite a lot of volume. It's
            designed both for hypertrophy and strength. It starts with lower intensity / higher volume, then progresses
            to higher intensity / lower volume. It's a fun program to run, offering somewhat unusual and interesting rep
            schemes, with testing for different RMs each workout.
          </p>
          <p>
            It's an intermediate program, so you're going to find it most useful after your newbie gains are over.
            There's good variety in exercises, and a lot of people reported getting serious gains and new PRs after
            running this program.
          </p>
          <p>
            You can run it after beginner{" "}
            <a href="/programs/gzclp" target="_blank">
              GZCLP
            </a>{" "}
            program, or after beginner/intermediate{" "}
            <a href="/programs/gzcl-the-rippler" target="_blank">
              GZCL: The Rippler
            </a>{" "}
            program.
          </p>
          <ProgramDetailsGzclPrinciple />
          <h2>Application of the GZCL Principle to the Jacked And Tan 2.0 program</h2>
          <h3>T1 Exercise</h3>
          <p>
            For the T1 exercise, we start with high volume and low intensity (high reps, lower weight), and progress to
            lower volume and higher intensity (lower reps, higher weight) - so called Linear Periodization.
          </p>
          <p>
            First, you need to define your training max (TM), which is approximately equal to your 2RM (2 Rep Max).
            It'll be the basis for your "drop sets" for T1 exercise. Drop sets are the sets that you do after the Rep
            Max set, which are based on percentage of TM.
          </p>
          <p>
            The first set is a Rep Max set, where you have to work up to your Rep Max. For the first week it's 10RM, for
            the second - 8RM, etc. So, to work up your 10RM, you need to guess your approximate 10RM weight, and then do
            "warmup" sets, that are not fatiguing, slowly increasing the weight. Like, let's say you guessed your 10RM
            for Bench Press is 185lb. So, you do:
          </p>
          <ul>
            <li>5 reps with empty bar</li>
            <li>5 reps with 95lb</li>
            <li>3 reps with 135lb</li>
            <li>10 reps with 185lb</li>
          </ul>
          <p>
            If you missed, and chose the weight that is too heavy, and let's say you only could do 8 reps. Or too light,
            and you did 12 reps. That's okay! You'll get better at this later on, just record your weight/reps, and move
            to the drop sets.
          </p>
          <p>
            Drop sets are sets that are based on the Training Max. E.g. for week 1 it's 50% of TM, 10 reps each. Last
            set is As Many Reps As Possible (AMRAP) - try to do as many reps as possible (leaving 1-2 reps in the tan).
            It's a good way to push yourself, and also to see if you need to adjust TM - if you can get more than 12
            reps there, you may want to consider increasing TM.
          </p>
          <p>On week 6, you measure your 1RM. You don't do any T1 drop sets (and any T2 exercises).</p>
          <p>
            After that, for the next 5 weeks, instead of %TM for the drop sets, you use percentage of your Rep Max for
            that week. E.g. on Week 7 you do your 6RM set first, and then the drop sets would be 85% of 6RM.
          </p>
          <p>
            At the end, at the week 12, you do another 1RM measurement, without T1 drop sets and T2 exercises again.
          </p>
          <p>
            It sounds pretty complicated, but should be way more clear when you look at the example below, and also
            after playing around with the interactive example at the bottom of this page.
          </p>
          <h3>Example of a T1 exercise sets/reps/weight week over week</h3>
          <p className="text-xs text-grayv2-main">Note that first RM sets are approximate in this example</p>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={evaluatedProgram}
              settings={props.settings}
              programExerciseKey="squat"
              exerciseType={{ id: "squat", equipment: "barbell" }}
            />
          </div>
          <h3>T2a Exercise</h3>
          <p>
            The T2a exercise weight is usually based on the T1 Training Max weight (since T2a exercises are auxiliary
            exercises to T1 ones). The exception is Front Squat, which is using its own TM.
          </p>
          <p>
            The weight/volume is also changing week over week in a wave pattern, adding sets on lower weights, to
            compensate drop in volume.
          </p>
          <p>You skip the exercise on the Week 6 and Week 12, when you measure your 1RM for T1 exercise.</p>
          <ProgramDetailsExerciseExample
            program={evaluatedProgram}
            settings={props.settings}
            programExerciseKey="deficit deadlift"
            exerciseType={{ id: "deficitDeadlift", equipment: "barbell" }}
          />
          <h3>T2b and T3 Exercises</h3>
          <p>
            T2b and T3 exercises are pretty similar to each other, they just use different first set RM value. So, for
            the first set, you attempt to do RM for the reps of that set (similar to T1), record the weight, and then
            you do the so-called Max Rep Sets (MRS). Simply, try to do as many reps as possible with the same weight as
            you did for the first set. For the 2nd, 3rd, etc Max Reps Set you likely will be able to do less and less
            reps, but that's okay and expected, as you're accumulating fatigue.
          </p>
          <p>You skip these exercises on the Week 7 and Week 12</p>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={evaluatedProgram}
              settings={props.settings}
              programExerciseKey="triceps pushdown"
              exerciseType={{ id: "tricepsPushdown", equipment: "cable" }}
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
            like for each week. You can edit the 2RM, 5RM, etc. weights for each exercise, and see how the weight
            changes.
          </p>
          <p>You can run the GZCL: Jacked And Tan 2.0 program in the Liftosaur app.</p>
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
