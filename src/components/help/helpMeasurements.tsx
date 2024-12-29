import React, { JSX } from "react";

export function HelpMeasurements(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Measurements</h2>
      <p className="pb-2">
        Here you can track your <strong>body measurements</strong> - bodyweight, size of your biceps, shoulders, calfs,
        etc.
      </p>
      <p className="pb-2">
        Then, on the <strong>"Graphs"</strong> screen, you can see correlation of the measurement graphs and the workout
        graphs, and see how the lifted weights and body measurements correlate.
      </p>
      <p className="pb-2">
        To see specific data points, pick the measurement <strong>Type</strong> at the top of the screen.
      </p>
      <p className="pb-2">If you have more than 3 data points, you'll also see the graph.</p>
      <p className="pb-2">
        You can edit and remove the data points below the graph, and you can add new data points by clicking on a button
        in the footer.
      </p>
    </>
  );
}
