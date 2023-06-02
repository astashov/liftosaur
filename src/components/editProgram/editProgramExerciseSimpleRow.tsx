import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { Program } from "../../models/program";
import { ProgramExercise } from "../../models/programExercise";
import { IProgramExercise, ISettings, IProgramSet } from "../../types";
import { SendMessage } from "../../utils/sendMessage";
import { Input } from "../input";

interface IEditProgramExerciseSimpleRowProps {
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  onChange: (sets?: number, reps?: number, weight?: number) => void;
  settings: ISettings;
}

export function EditProgramExerciseSimpleRow(props: IEditProgramExerciseSimpleRowProps): JSX.Element {
  const { programExercise, allProgramExercises, settings } = props;
  const sets = ProgramExercise.getVariations(programExercise, allProgramExercises)[0].sets;
  const firstSet: IProgramSet | undefined = sets[0];
  const reps = Program.runScript(programExercise, allProgramExercises, firstSet?.repsExpr || "", 1, settings, "reps");
  const weight = Program.runScript(
    programExercise,
    allProgramExercises,
    firstSet?.weightExpr || "",
    1,
    settings,
    "weight"
  );

  const setsRef = useRef<HTMLInputElement>();
  const repsRef = useRef<HTMLInputElement>();
  const weightRef = useRef<HTMLInputElement>();

  function getSetsNum(): number | undefined {
    const value = setsRef.current.value;
    if (value != null) {
      let setsNum = parseInt(value, 10);
      if (isNaN(setsNum)) {
        setsNum = 1;
      }
      setsNum = Math.max(1, Math.min(100, setsNum));
      return setsNum;
    }
    return undefined;
  }

  function getRepsNum(): number | undefined {
    const value = repsRef.current.value;
    if (value != null) {
      let repsNum = parseInt(value, 10);
      if (isNaN(repsNum)) {
        repsNum = 1;
      }
      repsNum = Math.max(1, Math.min(999, repsNum));
      return repsNum;
    }
    return undefined;
  }

  function getWeightNum(): number | undefined {
    const value = weightRef.current.value;
    if (value != null) {
      let weightNum = parseFloat(value);
      if (isNaN(weightNum)) {
        weightNum = 1;
      }
      weightNum = Math.max(0, Math.min(2000, weightNum));
      return weightNum;
    }
    return undefined;
  }

  return (
    <section className="flex items-center py-1">
      <div className="flex-1 min-w-0">
        <Input
          label="Sets"
          data-cy="sets-input"
          ref={setsRef}
          type="tel"
          max={100}
          min={1}
          placeholder="Sets"
          value={sets.length}
          onBlur={() => {
            props.onChange(getSetsNum(), getRepsNum(), getWeightNum());
          }}
        />
      </div>
      <div className="px-1 pt-5">x</div>
      <div className="flex-1 min-w-0">
        <Input
          label="Reps"
          data-cy="reps-input"
          max={100}
          min={1}
          ref={repsRef}
          type="tel"
          placeholder="Reps"
          value={reps.success ? reps.data : ""}
          onBlur={() => {
            props.onChange(getSetsNum(), getRepsNum(), getWeightNum());
          }}
        />
      </div>
      <div className="px-1 pt-5"></div>
      <div className="flex-1 min-w-0">
        <Input
          label="Weight"
          data-cy="weight-input"
          max={2000}
          min={0}
          type={SendMessage.isIos() ? "number" : "tel"}
          ref={weightRef}
          placeholder="0"
          value={weight.success ? weight.data.value : ""}
          onBlur={() => {
            props.onChange(getSetsNum(), getRepsNum(), getWeightNum());
          }}
        />
      </div>
      <span className="pt-5 pl-1">{settings.units}</span>
    </section>
  );
}
