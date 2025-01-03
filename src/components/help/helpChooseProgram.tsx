import React, { JSX } from "react";
import { Link } from "../link.web";

export function HelpChooseProgram(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Choose a program to clone</h2>
      <p className="pb-2">
        This screen lists your programs, as well as the available pre-built programs, so you can <strong>clone</strong>{" "}
        them.
      </p>
      <p className="pb-2">
        Tapping on one of your programs selects it for the next workout. If you want to <strong>edit</strong> it or{" "}
        <strong>remove</strong> it, press the <strong>"Edit"</strong> button on the right.
      </p>
      <p className="pb-2">
        <strong>Cloning</strong> a pre-built means you copy the program to the list of your programs.
      </p>
      <p className="pb-2">
        A program defines the list of workout days and the exercises for each day. It also defines the logic for
        increasing or decreasing reps and weights over time, depending on your workout performance.
      </p>
      <p className="pb-2">
        After you clone a program, you can modify it in any way you want. The app is very flexible, you can change the
        reps/weights logic, using a special scripting language called <Link href="/docs">Liftoscript</Link>
      </p>
    </>
  );
}
