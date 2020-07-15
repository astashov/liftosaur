import { h, JSX } from "preact";
import { IProgramDay2, IEditProgram } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { FooterView } from "../footer";
import { EditProgramExcerciseView } from "./editProgramExcerciseView";
import { useState } from "preact/hooks";
import { ModalAddExcercise } from "./modalAddExcercise";
import { IExcerciseType } from "../../models/excercise";
import { IProgramSet } from "../../models/set";
import { ModalEditSet } from "./modalEditSet";
import { Button } from "../button";
import { MenuItemEditable } from "../menuItemEditable";
import { lb } from "../../utils/lens";
import { IState } from "../../ducks/reducer";

interface IProps {
  editProgram: IEditProgram;
  editDay: IProgramDay2;
  dispatch: IDispatch;
}

export interface IEditSet {
  excerciseIndex: number;
  setIndex?: number;
}

export function EditProgramDay(props: IProps): JSX.Element {
  const [shouldShowAddExcercise, setShouldShowAddExcercise] = useState(false);
  const [editSet, setEditSet] = useState<IEditSet | undefined>(undefined);

  function getSet(es: IEditSet): IProgramSet | undefined {
    return es.setIndex != null ? props.editDay.excercises[es.excerciseIndex]?.sets?.[es.setIndex] : undefined;
  }

  function getExcercise(es: IEditSet): IExcerciseType {
    return props.editDay.excercises[es.excerciseIndex].excercise;
  }

  return (
    <section className="h-full">
      <HeaderView
        title="Edit Program"
        subtitle={props.editProgram.program.name}
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <section className="flex-1 overflow-y-auto">
          <MenuItemEditable
            type="text"
            name="Name:"
            value={props.editDay.name}
            onChange={(newValue) => {
              if (newValue != null) {
                props.dispatch({
                  type: "UpdateState",
                  lensRecording: [lb<IState>().pi("editProgram").pi("editDay").p("day").p("name").record(newValue)],
                });
              }
            }}
          />
          {props.editDay.excercises.map((entry, i) => {
            return (
              <EditProgramExcerciseView
                entry={entry}
                dispatch={props.dispatch}
                onEditSet={(setIndex) => {
                  if (setIndex == null && entry.sets.length > 0) {
                    const set = entry.sets[entry.sets.length - 1];
                    props.dispatch({
                      type: "EditDayAddSet",
                      excerciseIndex: i,
                      set,
                    });
                  } else {
                    setEditSet({ excerciseIndex: i, setIndex });
                  }
                }}
                onDeleteSet={(setIndex) => {
                  props.dispatch({ type: "EditDayRemoveSet", excerciseIndex: i, setIndex });
                }}
              />
            );
          })}
        </section>
        <button
          className="w-full px-4 py-4 mb-2 text-center bg-gray-100 border border-gray-300 border-dashed rounded-lg"
          onClick={() => {
            setShouldShowAddExcercise(true);
          }}
        >
          +
        </button>
        <section className="flex pb-2 mx-2">
          <div className="flex-1 mr-auto">
            <Button kind="blue" onClick={() => props.dispatch({ type: "PushScreen", screen: "editProgramDayScript" })}>
              Edit Script
            </Button>
          </div>
          <div>
            <Button
              kind="green"
              onClick={() => {
                props.dispatch({ type: "SaveProgramDay" });
              }}
            >
              Save
            </Button>
          </div>
        </section>
      </section>
      {shouldShowAddExcercise && (
        <ModalAddExcercise
          onSelect={(value) => {
            setShouldShowAddExcercise(false);
            if (value != null) {
              props.dispatch({ type: "EditDayAddExcerciseAction", value: value as IExcerciseType });
            }
          }}
        />
      )}

      {editSet && (
        <ModalEditSet
          state={props.editProgram.program.initialState}
          excercise={getExcercise(editSet)}
          set={getSet(editSet)}
          onDone={(result) => {
            if (result != null) {
              props.dispatch({
                type: "EditDayAddSet",
                excerciseIndex: editSet.excerciseIndex,
                set: result,
                setIndex: editSet.setIndex,
              });
            }
            setEditSet(undefined);
          }}
        />
      )}

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
