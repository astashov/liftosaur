import { JSX, h, Fragment } from "preact";
import { Link } from "../link";
import { IconHandle } from "../icons/iconHandle";

export function HelpEditProgramExerciseAdvanced(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Edit Program Exercise - Advanced</h2>
      <p className="pb-2">
        This is the <strong>advanced</strong> mode of editing a program exercise. It allows you to specify the logic for
        changing reps, weights and to some extent - sets after completing the exercise, using special scripting language
        - <Link href="/docs/docs.html#liftoscript-tutorial">Liftoscript</Link>.
      </p>
      <p className="pb-2">
        To get familiar with Liftoscript, please read the documentation linked above, here we'll describe the features
        of this screen.
      </p>
      <h3 className="pb-2 text-lg font-bold">Exercise</h3>
      <p className="pb-2">
        At the top, there's <strong>Name</strong> input. It is used in case you have multiple similar exercises (e.g.
        multiple different Squats), to give them more descriptive names. Likely you don't need it change it often.
      </p>
      <p className="pb-2">
        Then, you need to <strong>pick an exercise</strong>. You can pick from a list of exercises (we have like 150 of
        them). You can also create a custom one, by choosing a name, an equipment for it, and also optionally - a list
        of <i>target</i> and <i>synergist</i> muscles. The muscles would be used for the muscle balance map of the day
        and the program.
      </p>
      <p className="pb-2">
        There's also <strong>Substitute exercise</strong> feature, where you can choose another exercise targeting the
        same or similar muscles, just different type, or with different equipment.
      </p>
      <h3 className="pb-2 text-lg font-bold">State Variables</h3>
      <p className="pb-2">
        After that, there's a block with <strong>State Variables</strong>. Those are the variables that will be changing
        after completing exercises. It could be the current <strong>weight</strong>, or <strong>1 Rep Max</strong>, or
        <strong>Training Max</strong>, or number of current <strong>successful</strong> finishes of the exercise, etc.
        You'll be able to refer to them in code via <strong>state.[variablename]</strong>, for example,{" "}
        <strong>state.weight</strong>
      </p>
      <h3 className="pb-2 text-lg font-bold">Sets, Reps and Weight</h3>
      <p className="pb-2">
        Next, you specify the <strong>sets, reps and weights</strong> of the exercise. Note that in the reps and weights
        fields, you can use any Liftoscript expression. For example, <strong>state.reps</strong> or{" "}
        <strong>state.weight * 0.9</strong>. Just a number is also a valid Liftoscript expression, so you can just type{" "}
        <strong>5</strong> in the reps field, for 5 reps. It will help you to debug the Liftoscript expressions by
        showing the evaluation result under the fields.
      </p>
      <p className="pb-2">
        You can mark an exercise as <strong>AMRAP</strong> - As Many Reps As Possible. That means you have to do at
        least the number of reps specified in the "reps" field to consider it successful, but you should strive to do as
        much as you possibly can.
      </p>
      <p className="pb-2">
        You can also change the order of sets by dragging them by the handle <IconHandle />.
      </p>
      <h3 className="pb-2 text-lg font-bold">Sets variations</h3>
      <p className="pb-2">
        Sometimes you may want to change the number of sets based on some logic as well. For example, you have 5x5 sets
        x reps, but in case of a failure, you may want to switch to e.g. 6x4 sets x reps.
      </p>
      <p className="pb-2">
        For that, you can use <strong>Sets Variations</strong>. There's a button that enables them{" "}
        <strong>"Enable Sets Variations"</strong>. Then, you create a new variation and specify sets, reps and weights
        for it separately. To define the logic when to switch to what variation, you use the Liftoscript expression in
        the <strong>"Variation Selection Script"</strong> field.
      </p>
      <h3 className="pb-2 text-lg font-bold">Warmup Sets</h3>
      <p className="pb-2">
        The warmup sets are defined as percentage of first set, or some static weight in lb/kg. You also specify when it
        shows up in the <strong> if &gt; </strong> field. E.g. <strong>5 x 30% if &gt; 135lb</strong> means that if the
        the warmup set will be there if the weight of the first set is greater than 135lb. And it will be 30% of the
        weight of the first set.
      </p>
      <h3 className="pb-2 text-lg font-bold">Finish Day Script</h3>
      <p className="pb-2">
        This is the Liftoscript script that will be executed after you finish the day. This is where you{" "}
        <strong>update your state variables</strong> and give them new values. Again, refer to{" "}
        <Link href="/docs/docs.html#liftoscript-tutorial">Liftoscript</Link> documentation for examples.
      </p>
      <h3 className="pb-2 text-lg font-bold">Playground</h3>
      <p className="pb-2">
        Playground gives you a chance to verify that all your logic works as expected. It looks exactly as during the
        workout. First you need to specify what is the current day you want to test (since your logic may depend on the
        day). Then, you can try different scenarios (successfully finish all sets, unsuccessfully finish some, etc), and
        see if the state variables are updated as expected.
      </p>
    </>
  );
}
