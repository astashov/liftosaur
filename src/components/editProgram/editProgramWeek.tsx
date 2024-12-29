import React, { JSX } from "react";
import { IDispatch } from "../../ducks/types";
import { MenuItemEditable } from "../menuItemEditable";
import { EditProgram } from "../../models/editProgram";
import { DraggableList } from "../draggableList";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";
import { ISettings, IProgram, IProgramWeek } from "../../types";
import { ILoading } from "../../models/state";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { IScreen, Screen } from "../../models/screen";
import { Footer2View } from "../footer2";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconTrash } from "../icons/iconTrash";
import { LinkButton } from "../linkButton";
import { IconPlus } from "../icons/iconPlus";

interface IProps {
  screenStack: IScreen[];
  weekIndex: number;
  settings: ISettings;
  editProgram: IProgram;
  editWeek: IProgramWeek;
  loading: ILoading;
  dispatch: IDispatch;
}

export interface IEditSet {
  exerciseIndex: number;
  setIndex?: number;
}

export function EditProgramWeek(props: IProps): JSX.Element {
  const { editProgram: program, editWeek: week, weekIndex } = props;

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Edit Program Week"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
    >
      <section className="px-4">
        <MenuItemEditable
          type="text"
          name="Name:"
          value={week.name}
          onChange={(newValue) => {
            if (newValue != null) {
              EditProgram.setWeekName(props.dispatch, program.id, weekIndex, newValue);
            }
          }}
        />
        <section data-cy="selected-days">
          <GroupHeader topPadding={true} name="Days in the week" />
          <DraggableList
            items={week.days}
            element={(dayRef, dayIndex, handleTouchStart) => {
              const day = program.days.find((d) => d.id === dayRef.id)!;
              const editDayIndex = program.days.indexOf(day);
              return (
                <MenuItem
                  handleTouchStart={handleTouchStart}
                  name={day.name}
                  value={
                    <>
                      <button
                        className="p-2 align-middle ls-day-edit-exercise button"
                        onClick={() => props.dispatch({ type: "EditDayAction", index: editDayIndex })}
                      >
                        <IconEditSquare />
                      </button>
                      <button
                        className="p-2 align-middle ls-day-toggle-exercise button"
                        onClick={() => EditProgram.removeWeekDay(props.dispatch, program.id, props.weekIndex, dayIndex)}
                      >
                        <IconTrash />
                      </button>
                    </>
                  }
                />
              );
            }}
            onDragEnd={(startIndex, endIndex) => {
              EditProgram.reorderDaysWithinWeek(props.dispatch, program.id, weekIndex, startIndex, endIndex);
            }}
          />
          <LinkButton
            name="edit-week-add-day"
            className="mt-2 mb-6 ls-day-add-exercise"
            onClick={() => props.dispatch({ type: "CreateDayAction", weekIndex: props.weekIndex })}
          >
            Create New Day
          </LinkButton>
        </section>
        <section data-cy="available-days">
          <GroupHeader name="Available days" />
          {program.days.map((day) => (
            <MenuItem
              name={day.name}
              onClick={() => {
                EditProgram.addWeekDay(props.dispatch, program.id, props.weekIndex, day.id);
              }}
              value={
                <div className="flex flex-row-reverse">
                  <IconPlus />
                </div>
              }
            />
          ))}
        </section>
      </section>
    </Surface>
  );
}
