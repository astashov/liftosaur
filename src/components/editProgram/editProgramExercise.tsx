import { ISettings } from "../../models/settings";
import { IProgramDay, IProgramExercise, Program } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { h, JSX } from "preact";
import { HeaderView } from "../header";
import { Thunk } from "../../ducks/thunks";
import { Tabs } from "../tabs";
import { useState } from "preact/hooks";
import { EditProgramExerciseAdvanced } from "./editProgramExerciseAdvanced";
import { FooterView } from "../footer";
import { EditProgramExerciseSimple } from "./editProgramExerciseSimple";

interface IProps {
  settings: ISettings;
  days: IProgramDay[];
  programIndex: number;
  programExercise: IProgramExercise;
  programName: string;
  dispatch: IDispatch;
}

export function EditProgramExercise(props: IProps): JSX.Element {
  const isEligibleForSimple = Program.isEligibleForSimpleExercise(props.programExercise).success;
  const [type, setType] = useState<"Simple" | "Advanced">(isEligibleForSimple ? "Simple" : "Advanced");

  return (
    <section className="h-full">
      <HeaderView
        title="Edit Program Exercise"
        subtitle={props.programName}
        left={
          <button
            onClick={() => {
              if (confirm("Are you sure? Your changes won't be saved")) {
                props.dispatch(Thunk.pullScreen());
              }
            }}
          >
            Back
          </button>
        }
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <div className="pt-1">
          <Tabs
            left="Simple"
            right="Advanced"
            selected={type}
            onChange={(newValue) => {
              setType(newValue);
            }}
          />
        </div>
        {type === "Simple" ? <EditProgramExerciseSimple {...props} /> : <EditProgramExerciseAdvanced {...props} />}
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
