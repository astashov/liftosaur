import { h, JSX, Fragment } from "preact";
import { IconMuscles2 } from "../icons/iconMuscles2";

export function HelpEditProgramDay(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Edit Program Day</h2>
      <p className="pb-2">
        On this screen you can edit day name and pick/reoder exercises that will be used in that day.
      </p>
      <p className="pb-2">
        To add exercises to the day, tap on them in the <strong>Available Exercises</strong> sections below. To remove -
        tap on them again.
      </p>
      <p className="pb-2">To reorder exercises, drag them by the 6-dot handle icon.</p>
      <p className="pb-2">
        The <IconMuscles2 /> icon in the left bottom corner will show you the muscles used in this day, and also the
        balance of the muscles engaged.
      </p>
    </>
  );
}
