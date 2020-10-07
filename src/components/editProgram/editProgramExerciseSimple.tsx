import { ISettings, Settings } from "../../models/settings";
import { IProgramDay, IProgramExercise, Program } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { h, JSX, Fragment } from "preact";
import { ModalExercise } from "../modalExercise";
import { useState, useRef } from "preact/hooks";
import { EditProgram } from "../../models/editProgram";
import { IconEdit } from "../iconEdit";
import { Exercise } from "../../models/exercise";
import { MenuItemEditable } from "../menuItemEditable";
import { MenuItem, MenuItemWrapper } from "../menuItem";
import { ObjectUtils } from "../../utils/object";
import { IBarKey } from "../../models/weight";
import { Button } from "../button";

interface IProps {
  settings: ISettings;
  days: IProgramDay[];
  programIndex: number;
  programExercise: IProgramExercise;
  programName: string;
  dispatch: IDispatch;
}

export function EditProgramExerciseSimple(props: IProps): JSX.Element {
  const { programExercise } = props;
  const isEligible = Program.isEligibleForSimpleExercise(programExercise);
  if (isEligible.success) {
    return <Edit {...props} />;
  } else {
    return <Errors errors={isEligible.error} />;
  }
}

function Edit(props: IProps): JSX.Element {
  const { programExercise, settings } = props;

  const [showModalExercise, setShowModalExercise] = useState<boolean>(false);
  const inputClassName = `block w-full px-2 py-1 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline`;

  const bars = Settings.bars(props.settings);
  const barOptions: [string, string][] = [
    ["", "No Bar"],
    ...ObjectUtils.keys(bars).map<[string, string]>((b) => [b, b]),
  ];

  const sets = programExercise.variations[0].sets;
  const reps = Program.runScript(programExercise, sets[0].repsExpr, 1, settings, "reps");
  const weight = Program.runScript(programExercise, sets[0].weightExpr, 1, settings, "weight");

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
      let weightNum = parseInt(value, 10);
      if (isNaN(weightNum)) {
        weightNum = 1;
      }
      weightNum = Math.max(0, Math.min(2000, weightNum));
      return weightNum;
    }
    return undefined;
  }

  const [trigger, setTrigger] = useState<boolean>(false);

  return (
    <div>
      <MenuItem
        name="Exercise"
        value={
          <Fragment>
            <button data-cy="select-exercise" className="px-4 align-middle" onClick={() => setShowModalExercise(true)}>
              <IconEdit size={20} lineColor="#0D2B3E" penColor="#A5B3BB" />
            </button>
            <span>{Exercise.get(programExercise.exerciseType).name}</span>
          </Fragment>
        }
      />
      <MenuItemEditable
        type="select"
        name="Bar"
        value={programExercise.exerciseType.bar || ""}
        values={barOptions}
        onChange={(newBar) => {
          EditProgram.changeExerciseBar(props.dispatch, newBar ? (newBar as IBarKey) : undefined);
        }}
      />
      <MenuItemWrapper name="sets-reps-weight">
        <section className="flex items-center py-1">
          <div className="flex-1">
            <label>
              <div className="text-xs italic">Sets</div>
              <input
                ref={setsRef}
                type="number"
                max={100}
                min={1}
                className={inputClassName}
                placeholder="Sets"
                value={sets.length}
                onChange={() => {
                  EditProgram.updateSimpleExercise(
                    props.dispatch,
                    props.settings.units,
                    getSetsNum(),
                    getRepsNum(),
                    getWeightNum()
                  );
                  setTrigger(!trigger);
                }}
              />
            </label>
          </div>
          <div className="px-1 pt-3">x</div>
          <div className="flex-1">
            <label>
              <div className="text-xs italic">Reps</div>
              <input
                max={100}
                min={1}
                ref={repsRef}
                type="number"
                className={inputClassName}
                placeholder="Reps"
                value={reps.success ? reps.data : ""}
                onChange={() => {
                  EditProgram.updateSimpleExercise(
                    props.dispatch,
                    props.settings.units,
                    getSetsNum(),
                    getRepsNum(),
                    getWeightNum()
                  );
                  setTrigger(!trigger);
                }}
              />
            </label>
          </div>
          <div className="px-1 pt-3"></div>
          <div className="flex-1">
            <label>
              <div className="text-xs italic">Weight</div>
              <input
                max={2000}
                min={0}
                type="number"
                ref={weightRef}
                className={inputClassName}
                placeholder="0"
                value={weight.success ? weight.data.value : ""}
                onChange={() => {
                  EditProgram.updateSimpleExercise(
                    props.dispatch,
                    props.settings.units,
                    getSetsNum(),
                    getRepsNum(),
                    getWeightNum()
                  );
                  setTrigger(!trigger);
                }}
              />
            </label>
          </div>
          <span className="pt-3 pl-1">{settings.units}</span>
        </section>
      </MenuItemWrapper>
      <div className="p-2 text-center">
        <Button kind="green" onClick={() => EditProgram.saveExercise(props.dispatch, props.programIndex)}>
          Save
        </Button>
      </div>
      <ModalExercise
        isHidden={!showModalExercise}
        onChange={(exerciseId) => {
          setShowModalExercise(false);
          if (exerciseId != null) {
            EditProgram.changeExerciseId(props.dispatch, exerciseId);
          }
        }}
      />
    </div>
  );
}

interface IErrorsProps {
  errors: string[];
}

function Errors(props: IErrorsProps): JSX.Element {
  return (
    <section className="p-4 text-sm">
      <p>
        You can't use <strong>Simple</strong> exercise editing, only <strong>Advanced</strong>, because to make it
        possible to use Simple editing, the exercise:
      </p>
      <ul className="pl-4 mt-2 list-disc">
        {props.errors.map((e) => (
          <li dangerouslySetInnerHTML={{ __html: e }} />
        ))}
      </ul>
      <p className="mt-2">
        So, please use <strong>Advanced</strong> editing mode.
      </p>
    </section>
  );
}
