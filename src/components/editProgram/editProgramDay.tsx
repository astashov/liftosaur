import React, { JSX } from "react";
import { IDispatch } from "../../ducks/types";
import { MenuItemEditable } from "../menuItemEditable";
import { EditProgram } from "../../models/editProgram";
import { DraggableList } from "../draggableList";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";
import { Thunk } from "../../ducks/thunks";
import { ISettings, IProgram, IProgramDay } from "../../types";
import { ILoading, IState, updateState } from "../../models/state";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { IScreen, Screen } from "../../models/screen";
import { Footer2View } from "../footer2";
import { IconMuscles2 } from "../icons/iconMuscles2";
import { ExerciseImage } from "../exerciseImage";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconTrash } from "../icons/iconTrash";
import { LinkButton } from "../linkButton";
import { IconCheckCircle } from "../icons/iconCheckCircle";
import { HelpEditProgramDay } from "../help/helpEditProgramDay";
import { BottomSheetItem } from "../bottomSheetItem";
import { BottomSheet } from "../bottomSheet";
import { useState } from "react";
import { IconKebab } from "../icons/iconKebab";
import { lb } from "lens-shmens";

interface IProps {
  isProgress: boolean;
  screenStack: IScreen[];
  dayIndex: number;
  settings: ISettings;
  editProgram: IProgram;
  editDay: IProgramDay;
  loading: ILoading;
  dispatch: IDispatch;
}

export interface IEditSet {
  exerciseIndex: number;
  setIndex?: number;
}

export function EditProgramDay(props: IProps): JSX.Element {
  const program = props.editProgram;
  const day = props.editDay;
  const { dayIndex } = props;
  const [shouldShowBottomSheet, setShouldShowBottomSheet] = useState<boolean>(false);

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpEditProgramDay />}
          screenStack={props.screenStack}
          rightButtons={[
            <button
              data-cy="navbar-3-dot"
              className="p-2 nm-edit-program-day-kebab"
              onClick={() => setShouldShowBottomSheet(true)}
            >
              <IconKebab />
            </button>,
          ]}
          title="Edit Program Day"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
      addons={
        <BottomSheet isHidden={!shouldShowBottomSheet} onClose={() => setShouldShowBottomSheet(false)}>
          <div className="p-4">
            <BottomSheetItem
              isFirst={true}
              name="muscles-day"
              className="ls-muscles-day"
              title="Muscles"
              icon={<IconMuscles2 />}
              description="Muscle balance of the current day."
              onClick={() => {
                updateState(props.dispatch, [
                  lb<IState>()
                    .p("muscleView")
                    .record({ type: "day", programId: props.editProgram.id, dayIndex: props.dayIndex }),
                ]);
                props.dispatch(Thunk.pushScreen("muscles"));
              }}
            />
          </div>
        </BottomSheet>
      }
    >
      <section className="px-4">
        <MenuItemEditable
          type="text"
          name="Name:"
          value={day.name}
          onChange={(newValue) => {
            if (newValue != null) {
              EditProgram.setDayName(props.dispatch, program, dayIndex, newValue);
            }
          }}
        />
        <section data-cy="selected-exercises">
          <GroupHeader topPadding={true} name="Selected exercises" />
          <DraggableList
            items={day.exercises}
            element={(exerciseRef, i, handleTouchStart) => {
              const exercise = program.exercises.find((e) => e.id === exerciseRef.id)!;
              return (
                <MenuItem
                  prefix={
                    <div style={{ marginTop: "-1px" }}>
                      <ExerciseImage
                        settings={props.settings}
                        className="w-6 mr-3"
                        exerciseType={exercise.exerciseType}
                        size="small"
                      />
                    </div>
                  }
                  handleTouchStart={handleTouchStart}
                  name={exercise.name}
                  value={
                    <>
                      <button
                        className="p-2 align-middle ls-day-edit-exercise button"
                        onClick={() => EditProgram.editProgramExercise(props.dispatch, exercise)}
                      >
                        <IconEditSquare />
                      </button>
                      <button
                        className="p-2 align-middle ls-day-toggle-exercise button"
                        onClick={() =>
                          EditProgram.toggleDayExercise(props.dispatch, program, props.dayIndex, exercise.id)
                        }
                      >
                        <IconTrash />
                      </button>
                    </>
                  }
                />
              );
            }}
            onDragEnd={(startIndex, endIndex) => {
              EditProgram.reorderExercises(props.dispatch, program, dayIndex, startIndex, endIndex);
            }}
          />
          <LinkButton
            name="program-day-create-new-exercise"
            className="mt-2 mb-6 ls-day-add-exercise"
            onClick={() => EditProgram.addProgramExercise(props.dispatch, props.settings.units)}
          >
            Create New Exercise
          </LinkButton>
        </section>
        <section data-cy="available-exercises">
          <GroupHeader name="Available exercises" />
          {program.exercises.map((exercise) => (
            <MenuItem
              prefix={
                <div style={{ marginTop: "-1px" }}>
                  <ExerciseImage
                    settings={props.settings}
                    className="w-6 mr-3"
                    exerciseType={exercise.exerciseType}
                    size="small"
                  />
                </div>
              }
              name={exercise.name}
              onClick={() => {
                EditProgram.toggleDayExercise(props.dispatch, program, props.dayIndex, exercise.id);
              }}
              value={
                <div className="flex flex-row-reverse">
                  <IconCheckCircle isChecked={day.exercises.some((e) => e.id === exercise.id)} />
                </div>
              }
            />
          ))}
        </section>
      </section>
    </Surface>
  );
}
