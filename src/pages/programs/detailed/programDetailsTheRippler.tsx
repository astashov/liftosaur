import { h, JSX } from "preact";
import { IProgram, ISettings } from "../../../types";
import { IAudioInterface } from "../../../lib/audioInterface";
import { ObjectUtils } from "../../../utils/object";
import { IconEditSquare } from "../../../components/icons/iconEditSquare";
import { IconCheckCircle } from "../../../components/icons/iconCheckCircle";
import { ProgramDetailsUpsell } from "../programDetails/programDetailsUpsell";
import { ProgramDetailsExerciseExample } from "../programDetails/programDetailsExerciseExample";
import { Muscle } from "../../../models/muscle";
import { MusclesView } from "../../../components/muscles/musclesView";
import { ProgramDetailsGzclPrinciple } from "./programDetailsGzclPrinciple";
import { ProgramDetailsWorkoutPlayground } from "../programDetails/programDetailsWorkoutPlayground";
import { Program } from "../../../models/program";
import { PP } from "../../../models/pp";

export interface IProgramDetailsTheRipplerProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsTheRippler(props: IProgramDetailsTheRipplerProps): JSX.Element {
  const program = Program.fullProgram(ObjectUtils.clone(props.program), props.settings);
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
  const t1Pct = [80, 85, 82.5, 87.5, 85, 90, 87.5, 92.5, 90, 95, 85, 95];
  const t2Pct = [68, 72, 76, 70, 74, 78, 72, 76, 80, 85];

  return (
    <section className="px-4">
      <h1 className="text-2xl font-bold leading-8 text-center">GZCL: The Rippler Program Explained</h1>
      <div className="mb-4 text-sm font-bold text-center">
        <a href="https://www.gainzfever.com/" target="_blank" className="underline text-bluev2">
          By Cody Lefever
        </a>
      </div>
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
          <ProgramDetailsGzclPrinciple />
          <h2>Application of the GZCL Principle to The Rippler Program</h2>
          <p>
            In The Rippler program, we use the 2 rep max (2RM) weight as a basis. This is a <strong>12-week</strong>{" "}
            program, where the weight for T1 and T2 exercises changes each week according to a specific pattern.
          </p>
          <p>
            For <strong>T1 exercises</strong>, we increase the weight for 2 weeks, then slightly decrease it, and
            increase it even more in week 4. This pattern repeats through 4-week blocks. We'll have three 4-week blocks.
            We use 2 rep max (2RM) as a base weight for T1 exercises. So, for first 4 weeks we do 85%, 87.5%, 90%, 92.5%
            of 2RM weight. Liftosaur uses 1RM as a basis for the programs though, so the weights are converted into 1RM.
          </p>
          <h3>Example of a T1 exercise sets/reps/weight week over week</h3>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={evaluatedProgram}
              settings={props.settings}
              programExerciseKey="bench press"
              exerciseType={{ id: "benchPress", equipment: "barbell" }}
              weekSetup={evaluatedProgram.weeks
                .slice(0, 12)
                .map((w, i) => ({ ...w, name: `${w.name} (${t1Pct[i]}%)` }))}
            />
          </div>
          <p>
            For <strong>T2 exercises</strong>, we gradually increase the weights over 3 weeks (e.g., 80%, 85%, 90%),
            then reset to 82.5%, and increase again (82.5%, 87.5%, 92.5%). We repeat this pattern over four 3-week
            blocks, creating a wave-like pattern. We use 5 rep max (5RM) as a base weight for T2 exercises. We skip T2
            exercises completely on weeks 11 and 12. Again, the weights in Liftosaur are converted into % of 1RM.
          </p>
          <h3>Example of a T2 exercise sets/reps/weight week over week</h3>
          <div className="mb-4">
            <ProgramDetailsExerciseExample
              program={evaluatedProgram}
              programExerciseKey="incline bench press"
              exerciseType={{ id: "inclineBenchPress", equipment: "barbell" }}
              settings={props.settings}
              weekSetup={evaluatedProgram.weeks
                .slice(0, 10)
                .map((w, i) => ({ ...w, name: `${w.name} (${t2Pct[i]}%)` }))}
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
            Starting from week 11, you'll begin preparing for the 1RM test. You won't perform the T2 and T3 exercises at
            all during this period. On week 11, you will do heavy 2RMs of T1, and on week 12, you'll test your 1RM, and
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
      <ProgramDetailsWorkoutPlayground program={program} settings={props.settings} />
      <div className="mt-8">
        <ProgramDetailsUpsell />
      </div>
    </section>
  );
}
