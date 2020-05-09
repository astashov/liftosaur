import { h, JSX, Fragment } from "preact";
import { I5314BState, I5314BAccessory, I5314BAccessoryDay } from "../../the5314bProgram";
import { IDispatch } from "../../../../ducks/types";
import { IProgramId, Program } from "../../../program";
import { MenuItemEditable } from "../../../../components/menuItemEditable";
import { Excercise, excercises, IExcerciseType } from "../../../excercise";
import { Reps } from "../../../set";
import { MenuItem } from "../../../../components/menuItem";
import { StringUtils } from "../../../../utils/string";
import { useState } from "preact/hooks";
import { FooterView } from "../../../../components/footer";
import { HeaderView } from "../../../../components/header";
import { ObjectUtils } from "../../../../utils/object";
import { lb } from "../../../../utils/lens";
import { CollectionUtils } from "../../../../utils/collection";

interface IProps {
  dispatch: IDispatch;
  state: I5314BState;
  programId: IProgramId;
}

function GroupHeader(props: { name: string }): JSX.Element {
  return <div className="px-6 py-1 text-sm font-bold bg-gray-200">{props.name}</div>;
}

export function The5314bProgramSettings(props: IProps): JSX.Element {
  const program = Program.get(props.programId);
  const [selectedAccessory, setSelectedAccessory] = useState<[keyof I5314BAccessoryDay, number] | undefined>(undefined);
  return (
    <section className="flex flex-col h-full">
      <HeaderView
        title="Program Settings"
        subtitle={
          selectedAccessory != null
            ? `${StringUtils.capitalize(selectedAccessory[0])} Day ${selectedAccessory[1] + 1}`
            : program.name
        }
        left={
          <button
            onClick={() => {
              if (selectedAccessory != null) {
                setSelectedAccessory(undefined);
              } else {
                props.dispatch({ type: "PullScreen" });
              }
            }}
          >
            Back
          </button>
        }
      />
      <section className="flex flex-col flex-1 h-0 overflow-y-auto">
        {selectedAccessory == null ? (
          <Settings
            {...props}
            onAccessorySelect={(type, day) => {
              setSelectedAccessory([type, day]);
            }}
          />
        ) : (
          <The5314bProgramAccessorySettings selectedAccessory={selectedAccessory} {...props} />
        )}
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}

function Settings(
  props: IProps & { onAccessorySelect: (type: keyof I5314BAccessoryDay, day: number) => void }
): JSX.Element {
  return (
    <Fragment>
      <GroupHeader name="Training Maxes" />
      {(["squat", "benchPress", "deadlift", "overheadPress"] as const).map((exc) => {
        const excercise = Excercise.get(exc);
        return (
          <MenuItemEditable
            name={excercise.name}
            value={props.state.main[exc].trainingMax.toString()}
            type="number"
            valueUnits="lb"
            onChange={(newValue) => {
              const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
              if (v != null) {
                const lensPlay = lb<I5314BState>().p("main").p(exc).p("trainingMax").play(v);
                props.dispatch({ type: "UpdateProgramState", name: "the5314b", lensPlay });
              }
            }}
          />
        );
      })}
      <GroupHeader name="Assistance work" />
      <section className="text-sm">
        {([0, 1, 2] as const).map((day) =>
          (["push", "pull", "legs"] as const).map((type) => (
            <MenuItem
              name={`${StringUtils.capitalize(type)} Day ${day}`}
              value={convertAccessoryToString(props.state.accessories[day][type])}
              onClick={() => props.onAccessorySelect(type, day)}
              shouldShowRightArrow={true}
            />
          ))
        )}
      </section>
    </Fragment>
  );
}

function convertAccessoryToString(accessory: I5314BAccessory): string {
  const excercise = Excercise.get(accessory.excercise);
  return `${excercise.name}, ${Reps.display(accessory.sets, true)}, ${accessory.sets[0].weight}lb`;
}

function The5314bProgramAccessorySettings(
  props: IProps & { selectedAccessory: [keyof I5314BAccessoryDay, number] }
): JSX.Element {
  const [type, day] = props.selectedAccessory;
  const accessory = props.state.accessories[day][type];
  return (
    <Fragment>
      <MenuItemEditable
        name="Excercise"
        type="select"
        values={ObjectUtils.keys(excercises).map((e) => [excercises[e].id, excercises[e].name])}
        value={accessory.excercise}
        onChange={(newValue?: string) => {
          const excercise = newValue as IExcerciseType;
          const lensPlay = lb<I5314BState>().p("accessories").i(day).p(type).p("excercise").play(excercise);
          props.dispatch({ type: "UpdateProgramState", name: "the5314b", lensPlay });
        }}
      />
      <MenuItemEditable
        name="Sets x Reps"
        type="text"
        value={Reps.display(accessory.sets, true)}
        pattern="[0-9]+x[0-9]+"
        patternMessage="Should be SETSxREPS, e.g. 3x8"
        onChange={(newValue?: string, e?: Event) => {
          console.log((e?.target as HTMLInputElement).validity.patternMismatch);
          if (newValue != null && /^[0-9]+x[0-9]+$/.test(newValue)) {
            const [sets, reps] = newValue!.split("x").map((p) => parseInt(p.trim(), 10));
            const weight = props.state.accessories[day][type].sets[0].weight;
            const newReps = CollectionUtils.repeat({ reps, weight }, sets);
            const lensPlay = lb<I5314BState>().p("accessories").i(day).p(type).p("sets").play(newReps);
            props.dispatch({ type: "UpdateProgramState", name: "the5314b", lensPlay });
          }
        }}
      />
      <MenuItemEditable
        name="Weight"
        type="number"
        value={accessory.sets[0].weight.toString()}
        valueUnits="lb"
        onChange={(newValue?: string) => {
          const weight = parseInt(newValue!, 10);
          const newReps = props.state.accessories[day][type].sets.map((r) => ({ ...r, weight }));

          const lensPlay = lb<I5314BState>().p("accessories").i(day).p(type).p("sets").play(newReps);
          props.dispatch({ type: "UpdateProgramState", name: "the5314b", lensPlay });
        }}
      />
      <MenuItemEditable
        name="Is last set AMRAP?"
        type="boolean"
        value={accessory.sets[accessory.sets.length - 1].isAmrap ? "true" : "false"}
        onChange={(newValue?: string) => {
          const isSelected = newValue != null && JSON.parse(newValue) === true;
          const setsLength = accessory.sets.length - 1;
          const lensPlay = lb<I5314BState>()
            .p("accessories")
            .i(day)
            .p(type)
            .p("sets")
            .i(setsLength)
            .p("isAmrap")
            .play(isSelected);
          props.dispatch({ type: "UpdateProgramState", name: "the5314b", lensPlay });
        }}
      />
    </Fragment>
  );
}
