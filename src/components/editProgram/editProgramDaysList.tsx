import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { GroupHeader } from "../groupHeader";
import { MenuItem, MenuItemWrapper } from "../menuItem";
import { FooterView } from "../footer";
import { IconDuplicate } from "../iconDuplicate";
import { lb } from "lens-shmens";
import { IconDelete } from "../iconDelete";
import { DraggableList } from "../draggableList";
import { EditProgram } from "../../models/editProgram";
import { MenuItemEditable } from "../menuItemEditable";
import { StringUtils } from "../../utils/string";
import { IconEdit } from "../iconEdit";
import { IState } from "../../models/state";
import { Button } from "../button";
import { useState } from "preact/hooks";
import { ModalPublishProgram } from "../modalPublishProgram";
import { IconMuscles } from "../iconMuscles";
import { Thunk } from "../../ducks/thunks";
import { IProgram } from "../../types";

interface IProps {
  editProgram: IProgram;
  programIndex: number;
  dispatch: IDispatch;
  adminKey?: string;
}

export function EditProgramDaysList(props: IProps): JSX.Element {
  const [shouldShowPublishModal, setShouldShowPublishModal] = useState<boolean>(false);

  return (
    <section className="h-full">
      <HeaderView
        title="Edit Program"
        subtitle={props.editProgram.name}
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <p className="px-4 py-1 text-sm italic text-center">
          A program consists of days, a day consists of exercises. Add exercises to days here.
        </p>
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
          type="number"
          name="Next Day:"
          value={props.editProgram.nextDay.toString()}
          onChange={(newValueStr) => {
            const newValue = newValueStr != null ? parseInt(newValueStr, 10) : undefined;
            if (newValue != null && !isNaN(newValue)) {
              const newDay = Math.max(1, Math.min(newValue, props.editProgram.days.length));
              EditProgram.setNextDay(props.dispatch, props.editProgram, newDay);
            }
          }}
        />
        <GroupHeader name="Days" help={<span>Add exercises to days so they appear in workouts.</span>} />
        <DraggableList
          onDragEnd={(startIndex, endIndex) => {
            EditProgram.reorderDays(props.dispatch, props.programIndex, startIndex, endIndex);
          }}
          items={props.editProgram.days}
          element={(day, index, handleTouchStart) => {
            return (
              <MenuItem
                handleTouchStart={handleTouchStart}
                name={day.name}
                value={
                  <Fragment>
                    <button
                      data-cy="edit-day"
                      className="ls-days-list-edit-day button px-2 align-middle"
                      onClick={() => {
                        props.dispatch({ type: "EditDayAction", index });
                      }}
                    >
                      <IconEdit size={20} lineColor="#0D2B3E" penColor="#A5B3BB" />
                    </button>
                    <button
                      className="ls-days-list-copy-day button px-2 align-middle"
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
                      <IconDuplicate />
                    </button>
                    {props.editProgram.days.length > 1 && (
                      <button
                        data-cy={`menu-item-delete-${StringUtils.dashcase(day.name)}`}
                        className="ls-days-list-delete-day button px-2 align-middle"
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
                        <IconDelete />
                      </button>
                    )}
                  </Fragment>
                }
              />
            );
          }}
        />
        <MenuItemWrapper
          name="add-day"
          onClick={() => {
            props.dispatch({ type: "CreateDayAction" });
          }}
        >
          <div className="p-2 text-center border border-gray-500 border-dashed rounded-md">Add Day +</div>
        </MenuItemWrapper>
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
              name={exercise.name}
              value={
                <Fragment>
                  <button
                    data-cy="edit-exercise"
                    className="ls-days-list-edit-exercise button px-2 align-middle"
                    onClick={() => {
                      EditProgram.editProgramExercise(props.dispatch, exercise);
                    }}
                  >
                    <IconEdit size={20} lineColor="#0D2B3E" penColor="#A5B3BB" />
                  </button>
                  <button
                    className="ls-days-list-copy-exercise button px-2 align-middle"
                    onClick={() => {
                      EditProgram.copyProgramExercise(props.dispatch, props.editProgram, exercise);
                    }}
                  >
                    <IconDuplicate />
                  </button>
                  <button
                    className="ls-days-list-delete-exercise button px-2 align-middle"
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
                    <IconDelete />
                  </button>
                </Fragment>
              }
            />
          );
        })}
        <MenuItemWrapper name="add-exercise" onClick={() => EditProgram.addProgramExercise(props.dispatch)}>
          <div className="p-2 text-center border border-gray-500 border-dashed rounded-md">Add Exercise +</div>
        </MenuItemWrapper>
        {props.adminKey && (
          <div className="py-3 text-center">
            <Button
              kind="green"
              onClick={() => {
                setShouldShowPublishModal(true);
              }}
            >
              Publish
            </Button>
          </div>
        )}
      </section>

      <FooterView
        buttons={
          <button
            className="ls-footer-muscles p-4"
            aria-label="Muscles"
            data-cy="footer-muscles"
            onClick={() => props.dispatch(Thunk.pushScreen("musclesProgram"))}
          >
            <IconMuscles />
          </button>
        }
        dispatch={props.dispatch}
      />
      {shouldShowPublishModal && (
        <ModalPublishProgram
          program={props.editProgram}
          dispatch={props.dispatch}
          onClose={() => {
            setShouldShowPublishModal(false);
          }}
        />
      )}
    </section>
  );
}
