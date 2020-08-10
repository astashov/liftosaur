import { h, JSX } from "preact";
import { IProgram, IProgramDay } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { FooterView } from "../footer";
import { EditProgramExcerciseView } from "./editProgramExcerciseView";
import { useState } from "preact/hooks";
import { ModalAddExcercise } from "./modalAddExcercise";
import { IExcerciseType } from "../../models/excercise";
import { IProgramSet } from "../../models/set";
import { ModalEditSet } from "./modalEditSet";
import { MenuItemEditable } from "../menuItemEditable";
import { LensBuilder } from "../../utils/lens";
import { IState } from "../../ducks/reducer";
import { EditProgram } from "../../models/editProgram";
import { Button } from "../button";
import { DraggableList } from "../draggableList";
import { ISettings } from "../../models/settings";

interface IProps {
  isProgress: boolean;
  dayIndex: number;
  settings: ISettings;
  editProgram: IProgram;
  editDay: IProgramDay;
  editDayLensBuilder: LensBuilder<IState, IProgramDay>;
  dispatch: IDispatch;
}

export interface IEditSet {
  excerciseIndex: number;
  setIndex?: number;
}

export function EditProgramDay(props: IProps): JSX.Element {
  const day = props.editDay;
  const [shouldShowAddExcercise, setShouldShowAddExcercise] = useState(false);
  const [editSet, setEditSet] = useState<IEditSet | undefined>(undefined);

  function getSet(es: IEditSet): IProgramSet | undefined {
    return es.setIndex != null ? day.excercises[es.excerciseIndex]?.sets?.[es.setIndex] : undefined;
  }

  function getExcercise(es: IEditSet): IExcerciseType {
    return day.excercises[es.excerciseIndex].excercise;
  }

  return (
    <section className="h-full">
      <HeaderView
        title="Edit Program"
        subtitle={props.editProgram.name}
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <section className="flex-1 overflow-y-auto">
          <MenuItemEditable
            type="text"
            name="Name:"
            value={day.name}
            onChange={(newValue) => {
              if (newValue != null) {
                EditProgram.setDayName(props.dispatch, props.editDayLensBuilder, newValue);
              }
            }}
          />
          <DraggableList
            items={day.excercises}
            element={(entry, i, handleTouchStart) => {
              return (
                <EditProgramExcerciseView
                  entry={entry}
                  handleTouchStart={handleTouchStart}
                  editDayLensBuilder={props.editDayLensBuilder}
                  dispatch={props.dispatch}
                  onEditSet={(setIndex) => {
                    if (setIndex == null && entry.sets.length > 0) {
                      const set = entry.sets[entry.sets.length - 1];
                      EditProgram.addSet(props.dispatch, props.editDayLensBuilder, i, set);
                    } else {
                      setEditSet({ excerciseIndex: i, setIndex });
                    }
                  }}
                  onDeleteSet={(setIndex) => {
                    EditProgram.removeSet(props.dispatch, props.editDayLensBuilder, i, setIndex);
                  }}
                />
              );
            }}
            onDragEnd={(startIndex, endIndex) => {
              EditProgram.reorderExcercises(props.dispatch, props.editDayLensBuilder, startIndex, endIndex);
            }}
          />
        </section>
        <button
          className="w-full px-4 py-4 mb-2 text-center bg-gray-100 border border-gray-300 border-dashed rounded-lg"
          onClick={() => {
            setShouldShowAddExcercise(true);
          }}
        >
          +
        </button>

        {props.isProgress && (
          <div className="py-3 text-center">
            <Button kind="green" onClick={() => props.dispatch({ type: "SaveProgressDay" })}>
              Save
            </Button>
          </div>
        )}
      </section>
      <ModalAddExcercise
        isHidden={!shouldShowAddExcercise}
        settings={props.settings}
        onSelect={(excerciseId, bar) => {
          setShouldShowAddExcercise(false);
          if (excerciseId != null && bar != null) {
            EditProgram.addExcercise(props.dispatch, props.editDayLensBuilder, excerciseId, bar);
          }
        }}
      />

      {editSet && (
        <ModalEditSet
          day={props.dayIndex}
          settings={props.settings}
          state={props.editProgram.state}
          excercise={getExcercise(editSet)}
          set={getSet(editSet)}
          onDone={(result) => {
            if (result != null) {
              EditProgram.addSet(
                props.dispatch,
                props.editDayLensBuilder,
                editSet.excerciseIndex,
                result,
                editSet.setIndex
              );
            }
            setEditSet(undefined);
          }}
        />
      )}

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
