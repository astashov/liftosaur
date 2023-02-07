import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";
import { lb } from "lens-shmens";
import { DraggableList } from "../draggableList";
import { EditProgram } from "../../models/editProgram";
import { MenuItemEditable } from "../menuItemEditable";
import { StringUtils } from "../../utils/string";
import { ILoading, IState } from "../../models/state";
import { Button } from "../button";
import { useState } from "preact/hooks";
import { ModalPublishProgram } from "../modalPublishProgram";
import { Thunk } from "../../ducks/thunks";
import { IProgram, ISettings } from "../../types";
import { IScreen, Screen } from "../../models/screen";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { Footer2View } from "../footer2";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconTrash } from "../icons/iconTrash";
import { Exercise } from "../../models/exercise";
import { CollectionUtils } from "../../utils/collection";
import { ExerciseImage } from "../exerciseImage";
import { Program } from "../../models/program";
import { LinkButton } from "../linkButton";
import { IconKebab } from "../icons/iconKebab";
import { BottomSheetEditProgram } from "../bottomSheetEditProgram";
import { HelpEditProgramDaysList } from "../help/helpEditProgramDaysList";

interface IProps {
  editProgram: IProgram;
  programIndex: number;
  screenStack: IScreen[];
  dispatch: IDispatch;
  adminKey?: string;
  settings: ISettings;
  loading: ILoading;
}

export function EditProgramDaysList(props: IProps): JSX.Element {
  const [shouldShowPublishModal, setShouldShowPublishModal] = useState<boolean>(false);
  const [shouldShowBottomSheet, setShouldShowBottomSheet] = useState<boolean>(false);

  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpEditProgramDaysList />}
          screenStack={props.screenStack}
          rightButtons={[
            <button data-cy="navbar-3-dot" className="p-2" onClick={() => setShouldShowBottomSheet(true)}>
              <IconKebab />
            </button>,
          ]}
          title="Edit Program"
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
      addons={
        <>
          <BottomSheetEditProgram
            onExportProgramToFile={() => {
              setShouldShowBottomSheet(false);
              props.dispatch(Thunk.exportProgram(props.editProgram));
            }}
            editProgramId={props.editProgram.id}
            dispatch={props.dispatch}
            isHidden={!shouldShowBottomSheet}
            onClose={() => setShouldShowBottomSheet(false)}
          />
          <ModalPublishProgram
            isHidden={!shouldShowPublishModal}
            program={props.editProgram}
            dispatch={props.dispatch}
            onClose={() => {
              setShouldShowPublishModal(false);
            }}
          />
        </>
      }
    >
      <section className="px-4">
        <GroupHeader name="Current Program" />
        <MenuItem
          name="Program"
          value={props.editProgram.name}
          expandValue={true}
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk.pushScreen("programs"))}
        />
        <GroupHeader name="Program Details" topPadding={true} />
        <MenuItemEditable
          type="text"
          name="Name:"
          value={props.editProgram.name}
          onChange={(newValue) => {
            if (newValue != null) {
              EditProgram.setName(props.dispatch, props.editProgram, newValue);
            }
          }}
        />
        <MenuItemEditable
          type="select"
          name="Next Day:"
          values={props.editProgram.days.map((day, i) => [`${i + 1}`, day.name])}
          value={props.editProgram.nextDay.toString()}
          onChange={(newValueStr) => {
            const newValue = newValueStr != null ? parseInt(newValueStr, 10) : undefined;
            if (newValue != null && !isNaN(newValue)) {
              const newDay = Math.max(1, Math.min(newValue, props.editProgram.days.length));
              EditProgram.setNextDay(props.dispatch, props.editProgram, newDay);
            }
          }}
        />
        <GroupHeader
          topPadding={true}
          name="Days"
          help={<span>Add exercises to days so they appear in workouts.</span>}
        />
        <DraggableList
          onDragEnd={(startIndex, endIndex) => {
            EditProgram.reorderDays(props.dispatch, props.programIndex, startIndex, endIndex);
          }}
          items={props.editProgram.days}
          element={(day, index, handleTouchStart) => {
            const exerciseTypes = CollectionUtils.nonnull(
              day.exercises.map((exercise) => {
                const programExercise = Program.getProgramExerciseById(props.editProgram, exercise.id);
                return programExercise
                  ? Exercise.find(programExercise.exerciseType, props.settings.exercises)
                  : undefined;
              })
            );
            return (
              <MenuItem
                handleTouchStart={handleTouchStart}
                name={day.name}
                addons={exerciseTypes.map((e) => (
                  <ExerciseImage
                    exerciseType={e}
                    size="small"
                    customExercises={props.settings.exercises}
                    className="w-6 mr-1"
                  />
                ))}
                value={
                  <Fragment>
                    <button
                      data-cy="edit-day"
                      className="px-2 align-middle ls-days-list-edit-day button"
                      onClick={() => {
                        props.dispatch({ type: "EditDayAction", index });
                      }}
                    >
                      <IconEditSquare />
                    </button>
                    <button
                      className="px-2 align-middle ls-days-list-copy-day button"
                      onClick={() => {
                        const newName = `${day.name} Copy`;
                        props.dispatch({
                          type: "UpdateState",
                          lensRecording: [
                            lb<IState>()
                              .p("storage")
                              .p("programs")
                              .i(props.programIndex)
                              .p("days")
                              .recordModify((days) => {
                                const newDays = [...days];
                                newDays.push({ ...day, name: newName });
                                return newDays;
                              }),
                          ],
                        });
                      }}
                    >
                      <IconDuplicate2 />
                    </button>
                    {props.editProgram.days.length > 1 && (
                      <button
                        data-cy={`menu-item-delete-${StringUtils.dashcase(day.name)}`}
                        className="px-2 align-middle ls-days-list-delete-day button"
                        onClick={() => {
                          props.dispatch({
                            type: "UpdateState",
                            lensRecording: [
                              lb<IState>()
                                .p("storage")
                                .p("programs")
                                .i(props.programIndex)
                                .p("days")
                                .recordModify((days) => days.filter((d) => d !== day)),
                            ],
                          });
                        }}
                      >
                        <IconTrash />
                      </button>
                    )}
                  </Fragment>
                }
              />
            );
          }}
        />
        <LinkButton className="mt-2 mb-8" data-cy="add-day" onClick={() => props.dispatch({ type: "CreateDayAction" })}>
          Add New Day
        </LinkButton>
        <GroupHeader
          name="Exercises"
          help={
            <span>
              Exercises available in this program. You need to add them to <strong>days</strong> to make them appear in
              workouts. They could be reused inbetween days.
            </span>
          }
        />
        {props.editProgram.exercises.map((exercise) => {
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
              name={exercise.name}
              value={
                <Fragment>
                  <button
                    data-cy="edit-exercise"
                    className="px-2 align-middle ls-days-list-edit-exercise button"
                    onClick={() => {
                      EditProgram.editProgramExercise(props.dispatch, exercise);
                    }}
                  >
                    <IconEditSquare />
                  </button>
                  <button
                    className="px-2 align-middle ls-days-list-copy-exercise button"
                    onClick={() => {
                      EditProgram.copyProgramExercise(props.dispatch, props.editProgram, exercise);
                    }}
                  >
                    <IconDuplicate2 />
                  </button>
                  <button
                    className="px-2 align-middle ls-days-list-delete-exercise button"
                    onClick={() => {
                      const isExerciseUsed = props.editProgram.days.some(
                        (d) => d.exercises.map((e) => e.id).indexOf(exercise.id) !== -1
                      );
                      if (isExerciseUsed) {
                        alert("You can't delete this exercise, it's used in one of the days");
                      } else if (confirm("Are you sure?")) {
                        EditProgram.removeProgramExercise(props.dispatch, props.editProgram, exercise.id);
                      }
                    }}
                  >
                    <IconTrash />
                  </button>
                </Fragment>
              }
            />
          );
        })}
        <LinkButton
          className="mt-2 mb-6"
          data-cy="add-exercise"
          onClick={() => EditProgram.addProgramExercise(props.dispatch)}
        >
          Add New Exercise
        </LinkButton>
        {props.adminKey && (
          <div className="py-3 text-center">
            <Button
              kind="orange"
              onClick={() => {
                setShouldShowPublishModal(true);
              }}
            >
              Publish
            </Button>
          </div>
        )}
      </section>
    </Surface>
  );
}
