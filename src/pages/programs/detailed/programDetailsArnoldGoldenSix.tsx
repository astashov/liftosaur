import { ComponentChildren, h, JSX } from "preact";
import { IExerciseType, IProgram, ISettings } from "../../../types";
import { ExerciseImage } from "../../../components/exerciseImage";
import { IAudioInterface } from "../../../lib/audioInterface";
import { MusclesTypeView } from "../../../components/muscles/musclesView";
import { Muscle } from "../../../models/muscle";
import { IconEditSquare } from "../../../components/icons/iconEditSquare";
import { IconCheckCircle } from "../../../components/icons/iconCheckCircle";
import { ProgramDetailsUpsell } from "../programDetails/programDetailsUpsell";
import { ProgramDetailsWorkoutPlayground } from "../programDetails/programDetailsWorkoutPlayground";
import { Program } from "../../../models/program";
import { ObjectUtils } from "../../../utils/object";

export interface IProgramDetailsArnoldGoldenSixProps {
  settings: ISettings;
  program: IProgram;
  client: Window["fetch"];
  audio: IAudioInterface;
}

export function ProgramDetailsArnoldGoldenSix(props: IProgramDetailsArnoldGoldenSixProps): JSX.Element {
  const program = ObjectUtils.clone(props.program);
  const points = Muscle.normalizePoints(
    Muscle.getPointsForProgram(Program.evaluate(program, props.settings), props.settings)
  );

  return (
    <section className="px-4">
      <h1 className="mb-4 text-2xl font-bold leading-8 text-center">
        Arnold Schwarzenegger's Golden Six Program Explained
      </h1>
      <div className="flex flex-col sm:flex-row" style={{ gap: "1rem" }}>
        <div className="flex-1">
          <p className="mb-4">
            Arnold Schwarzenegger's Golden Six routine is a classic full-body hypertrophy workout that was popularized
            by the legendary bodybuilder and actor during the early stages of his career. This program is often
            recommended for beginners - it's very simple, contains compound exercises, and provides enough volume and
            frequency for beginners. It's also pretty short - only takes about an hour to finish the workout.
          </p>
          <p className="mb-4">
            Intermediate / advanced lifters would benefit more from other hypertrophy programs that provide more volume
            and exercise selection, like 5/3/1 Boring But Big, Dr. Swole Upper Lower program, etc.
          </p>
          <p className="mb-4">
            The program is very simple - it's just 6 exercises repeated per day, 3 days a week, on alternate days.
          </p>
          <ol>
            <ExerciseListItem index={1} exerciseType={{ id: "squat", equipment: "barbell" }} offsetY={-24}>
              <p>
                <strong>Squats</strong>: 4 sets of 10 reps.
              </p>
              <p>Squats are fundamental for building strength in the lower body and core.</p>
            </ExerciseListItem>
            <ExerciseListItem index={2} exerciseType={{ id: "benchPressWideGrip", equipment: "barbell" }} offsetY={-12}>
              <p>
                <strong>Wide-Grip Bench Press</strong>: 3 sets of 10 reps.
              </p>
              <p>
                This exercise targets the chest, shoulders, and triceps, with an emphasis on the chest. The wide grip is
                specifically good for working the pectoral muscles
              </p>
            </ExerciseListItem>
            <ExerciseListItem index={3} exerciseType={{ id: "chinUp", equipment: "bodyweight" }}>
              <p>
                <strong>Chin-Ups</strong>: AMRAP (as many reps as possible)
              </p>
              <p>
                If you can't do any of these, consider using an assisted chin-up machine or do negative chin-ups to
                start. These primarily work your back and biceps.
              </p>
            </ExerciseListItem>
            <ExerciseListItem index={4} exerciseType={{ id: "behindTheNeckPress", equipment: "barbell" }}>
              <p>
                <strong>Behind-the-Neck Press</strong>: 4 sets of 10 reps.
              </p>
              <p>
                This exercise targets the shoulders and triceps. Be careful with the 'behind-the-neck' part, it can be
                tough on the shoulders if done improperly. If it feels uncomfortable, a traditional overhead press to
                the front is a good alternative.
              </p>
            </ExerciseListItem>
            <ExerciseListItem index={5} exerciseType={{ id: "bicepCurl", equipment: "dumbbell" }}>
              <p>
                <strong>Barbell Curls</strong>: 3 sets of 10 reps.
              </p>
              <p>
                This exercise primarily targets the biceps. Be sure to keep your elbows still throughout the curl to
                ensure proper muscle engagement. If it feels uncomfortable, a dumbbell curl might be a good alternative.
              </p>
            </ExerciseListItem>
            <ExerciseListItem index={5} exerciseType={{ id: "crunch", equipment: "bodyweight" }} offsetY={-24}>
              <p>
                <strong>Bent Knee Sit-Ups</strong>: AMRAP (as many reps as possible)
              </p>
              <p>This is a good exercise to develop your core.</p>
            </ExerciseListItem>
          </ol>
          <p className="mb-4">
            For progression, you do the last set as AMRAP - as many reps as possible. For <strong>Chin-Ups</strong> and{" "}
            <strong>Crunches</strong>, next time you'll have to do at least as many as you were able to do this time +
            one more rep. And for the rest of the exercises, if you've achieved at least 13 reps, you should increase
            your weight by 5lb or 2.5kg in your next workout.{" "}
          </p>
        </div>
        <div className="w-64 mx-auto">
          <h3 className="text-lg font-bold leading-8 text-center">Muscle Balance</h3>
          <MusclesTypeView settings={props.settings} points={points} type="hypertrophy" hideListOfExercises={true} />
        </div>
      </div>
      <div className="w-32 h-px mx-auto my-8 b bg-grayv2-200" />
      <h3 className="mb-4 text-xl font-bold leading-8">Try it out in the interactive playground!</h3>
      <p className="mb-4">
        Tap on squares to finish sets. Tap multiple times to reduce completed reps. Finish the workout and see what the
        workout will look like next time (with possibly updated weights, reps and sets).
      </p>
      <p className="mb-4">
        For convenience, you can finish all the sets of an exercise by clicking on the{" "}
        <IconCheckCircle className="inline-block" isChecked={true} color="#BAC4CD" /> icon. And you can adjust the
        exercise variables (weight, reps, TM, RIR, etc.) by clicking on the <IconEditSquare className="inline-block" />{" "}
        icon.
      </p>
      <ProgramDetailsWorkoutPlayground program={program} settings={props.settings} />
      <div className="mt-8">
        <ProgramDetailsUpsell />
      </div>
    </section>
  );
}

function ExerciseListItem(props: {
  exerciseType: IExerciseType;
  index: number;
  offsetY?: number;
  children: ComponentChildren;
}): JSX.Element {
  return (
    <li className="flex mb-2">
      <div className="text-lg font-bold">{props.index}.</div>
      <div className="w-16 mx-2" style={{ marginTop: props.offsetY }}>
        <ExerciseImage className="w-full" exerciseType={props.exerciseType} size="small" />
      </div>
      <div className="flex-1">{props.children}</div>
    </li>
  );
}
