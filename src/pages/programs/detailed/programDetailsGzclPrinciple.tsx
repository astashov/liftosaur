import { h, JSX } from "preact";
import { ExerciseImage } from "../../../components/exerciseImage";

export function ProgramDetailsGzclPrinciple(): JSX.Element {
  return (
    <div>
      <h2>GZCL principle</h2>
      <p>Before diving in, here's some basic terminology:</p>
      <ul>
        <li>
          <strong>Rep Max</strong>: This refers to the maximum weight you can lift for a given number of reps. For
          instance, if you can do 5 reps (and no more) with 100 kg, then your 5 rep max is 100 kg. When measuring this,
          you should not go to full failure, but stop when you can't maintain good form for another rep.
        </li>
      </ul>
      <p>
        Now, let's talk about exercises. Exercises in GZCL programs are split into <strong>3 tiers</strong>:
      </p>
      <ul>
        <li>
          <strong>T1</strong>: These are main compound exercises (e.g.,{" "}
          <strong>
            <ExerciseImage className="w-6" exerciseType={{ id: "squat", equipment: "barbell" }} size="small" /> Squat,{" "}
            <ExerciseImage className="w-6" exerciseType={{ id: "deadlift", equipment: "barbell" }} size="small" />{" "}
            Deadlift,{" "}
            <ExerciseImage className="w-6" exerciseType={{ id: "benchPress", equipment: "barbell" }} size="small" />{" "}
            Bench Press,{" "}
            <ExerciseImage className="w-6" exerciseType={{ id: "overheadPress", equipment: "barbell" }} size="small" />{" "}
            Overhead Press{" "}
          </strong>
          ). These exercises involve the highest intensity (i.e., the largest weights, about <strong>85-100%</strong> of
          your 2-3 rep max), but with lower volume (fewer reps and sets). Typically, you will perform 10-15 total reps,
          usually within <strong>1-3 reps</strong> per set.
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
          , etc). These exercises have lower intensity (lower weights), but higher volume (more reps and sets). You
          should pick exercises that will assist with your T1 exercises. For example, if you want to improve your{" "}
          <strong>Squat</strong>, you could do <strong>Front Squats</strong> as a T2 exercise. These exercises are
          performed with <strong>65-85%</strong> of your 2-3 rep max, usually within <strong>5-8 reps</strong> per set.
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
          ). These exercises have the lowest intensity (lightest weights), but highest volume (most reps and sets). The
          goal is to choose exercises that will assist with your T1 and T2 exercises. These are performed with less than{" "}
          <strong>65%</strong> of your 2-3 rep max, usually with <strong>8 or more reps</strong> per set.
        </li>
      </ul>
      <p>
        A useful rule of thumb is the <strong>1:2:3 rule</strong> - for every rep you perform in T1, do 2 reps in T2,
        and 3 in T3.
      </p>
      <p>
        This is a very short description of the GZCL principle. For more information, and more details, I REALLY
        recommend to read{" "}
        <a href="http://swoleateveryheight.blogspot.com/2012/11/the-gzcl-method-for-powerlifting.html" target="_blank">
          Cody's blogpost
        </a>
        .
      </p>
    </div>
  );
}
