import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { MenuItemEditable } from "../menuItemEditable";
import { EditProgram } from "../../models/editProgram";
import { DraggableList } from "../draggableList";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";
import { Thunk } from "../../ducks/thunks";
import { ISettings, IProgram, IProgramDay } from "../../types";
import { ILoading } from "../../models/state";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { IScreen } from "../../models/screen";
import { Footer2View } from "../footer2";
import { FooterButton } from "../footerButton";
import { rightFooterButtons } from "../rightFooterButtons";
import { IconMuscles2 } from "../icons/iconMuscles2";
import { ExerciseImage } from "../exerciseImage";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconTrash } from "../icons/iconTrash";
import { LinkButton } from "../linkButton";
import { IconCheckCircle } from "../icons/iconCheckCircle";
import { HelpEditProgramDay } from "../help/helpEditProgramDay";

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

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpEditProgramDay />}
          screenStack={props.screenStack}
          title="Edit Program Day"
        />
      }
      footer={
        <Footer2View
          dispatch={props.dispatch}
          leftButtons={[
            <FooterButton
              icon={<IconMuscles2 />}
              text="Muscles"
              onClick={() => props.dispatch(Thunk.pushScreen("musclesDay"))}
            />,
          ]}
          rightButtons={rightFooterButtons({ dispatch: props.dispatch })}
        />
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
                    <ExerciseImage
                      className="w-6 mr-3"
                      exerciseType={exercise.exerciseType}
                      size="small"
                      customExercises={props.settings.exercises}
                    />
                  }
                  handleTouchStart={handleTouchStart}
                  name={exercise.name}
                  value={
                    <Fragment>
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
                    </Fragment>
                  }
                />
              );
            }}
            onDragEnd={(startIndex, endIndex) => {
              EditProgram.reorderExercises(props.dispatch, program, dayIndex, startIndex, endIndex);
            }}
          />
          <LinkButton
            className="mt-2 mb-6 ls-day-add-exercise"
            onClick={() => EditProgram.addProgramExercise(props.dispatch)}
          >
            Create New Exercise
          </LinkButton>
        </section>
        <section data-cy="available-exercises">
          <GroupHeader name="Available exercises" />
          {program.exercises.map((exercise) => (
            <MenuItem
              prefix={
                <ExerciseImage
                  className="w-6 mr-3"
                  exerciseType={exercise.exerciseType}
                  size="small"
                  customExercises={props.settings.exercises}
                />
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
