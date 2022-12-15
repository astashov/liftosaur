import { h, JSX, Fragment } from "preact";
import { IconFilter } from "../icons/iconFilter";

export function HelpStats(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Add Measurement</h2>
      <p className="pb-2">
        Here you enter your data points, what is your current bodyweight, calf size, bicep size, etc.
      </p>
      <p className="pb-2">
        You may track only the measurements you care about. You can setup the available input fields by clicking on the{" "}
        <IconFilter /> icon in the navbar.
      </p>
      <p className="pb-2">
        All fields are optional, if you skip them, those measurements just won't be added this time.
      </p>
    </>
  );
}
