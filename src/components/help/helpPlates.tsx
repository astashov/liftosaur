import React, { JSX } from "react";

export function HelpPlates(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Settings - Equipment</h2>
      <p className="pb-2">
        You specify your available equipment here, and specifically - what plates and what fixed weights you have
        available.
      </p>
      <p className="pb-2">
        For each equipment type (Barbell, Dumbbell, Cable, etc) you can choose whether you use{" "}
        <strong>fixed weight</strong> or <strong>plates</strong>.
      </p>
      <p className="pb-2">
        <strong>Fixed weight</strong> means you have e.g. 4 pairs of dumbbells of weight 10lb, 15lb, 20lb and 25lb, and
        that's it. They don't have plates which you can add to the dumbbell. It's fixed weight, you cannot add weight to
        a dumbbell. You can specify pairs of dumbbells of what weight you have, and the app would use only those.
      </p>
      <p className="pb-2">
        You also may have a <strong>Dumbbell with plates</strong>. It'd consist of a <strong>bar</strong> (which is e.g.
        10lb), and a set of <strong>pairs of plates</strong> - e.g. 4x2.5lb, 2x5lb, 2x10lb, etc. So you can add and
        remove plates to the bar, this way getting the weight you need. You can specify the bar weight and what number
        of plates you have of what weight. The app would round up the weights of the exercise sets to the available
        plates.
      </p>
      <p className="pb-2">
        Note that it only allow you to enter <strong>even number of plates</strong>, because you need to balance the
        bar.
      </p>
    </>
  );
}
