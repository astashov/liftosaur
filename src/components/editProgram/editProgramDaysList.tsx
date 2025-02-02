import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";
import { lb } from "lens-shmens";
import { DraggableList } from "../draggableList";
import { EditProgram } from "../../models/editProgram";
import { MenuItemEditable } from "../menuItemEditable";
import { StringUtils } from "../../utils/string";
import { INavCommon, IState, updateState } from "../../models/state";
import { Button } from "../button";
import { useState } from "preact/hooks";
import { ModalPublishProgram } from "../modalPublishProgram";
import { Thunk } from "../../ducks/thunks";
import { IProgram, ISettings } from "../../types";
import { Screen } from "../../models/screen";
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
import { ObjectUtils } from "../../utils/object";
import { UidFactory } from "../../utils/generator";
import { MigratorToPlanner } from "../../models/migratorToPlanner";
import { MigrationBanner } from "../migrationBanner";

interface IProps {
  editProgram: IProgram;
  programIndex: number;
  dispatch: IDispatch;
  adminKey?: string;
  settings: ISettings;
  navCommon: INavCommon;
}

export function EditProgramDaysList(props: IProps): JSX.Element {
  const [shouldShowPublishModal, setShouldShowPublishModal] = useState<boolean>(false);
  const [shouldShowBottomSheet, setShouldShowBottomSheet] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          helpContent={<HelpEditProgramDaysList />}
          rightButtons={[
            <button
              data-cy="navbar-3-dot"
              className="p-2 nm-edit-program-navbar-kebab"
              onClick={() => setShouldShowBottomSheet(true)}
            >
              <IconKebab />
            </button>,
          ]}
          title="Edit Program"
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
      addons={
        <>
          <BottomSheetEditProgram
            onExportProgramToFile={() => {
              setShouldShowBottomSheet(false);
              props.dispatch(Thunk.exportProgramToFile(props.editProgram));
            }}
            onExportProgramToLink={() => {
              setShouldShowBottomSheet(false);
              props.dispatch(Thunk.exportProgramToLink(props.editProgram));
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
        <MigrationBanner program={props.editProgram} settings={props.settings} client={window.fetch.bind(window)} />
        <div className="mb-2 text-sm text-grayv2-main">
          <div>
            You can use{" "}
            <LinkButton
              name="edit-program-copy-program-link"
              onClick={async () => {
                props.dispatch(
                  Thunk.generateAndCopyLink(props.editProgram, props.settings, () => {
                    setIsCopied(true);
                    setTimeout(() => {
                      setIsCopied(false);
                    }, 3000);
                  })
                );
              }}
            >
              this link
            </LinkButton>{" "}
            to edit this program on your laptop
          </div>
          {isCopied && <div className="font-bold">Copied to clipboard!</div>}
        </div>
        <GroupHeader name="Current Program" />
        <MenuItem
          name="Program"
          value={props.editProgram.name}
          expandValue={true}
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk.pushScreen("programs"))}
        />
        <div className="px-2 mb-2 text-xs text-right">
          <LinkButton onClick={() => props.dispatch(Thunk.pushScreen("programs"))} name="history-change-program">
            Change Program
          </LinkButton>
        </div>
        <GroupHeader name="Program Details" topPadding={true} />
        <MenuItemEditable
          type="text"
          name="Name:"
          value={props.editProgram.name}
          onChange={(newValue) => {
            if (newValue) {
              EditProgram.setName(props.dispatch, props.editProgram, newValue);
            }
          }}
        />
        <MenuItemEditable
          type="boolean"
          name="Is Multi-Week program?"
          value={props.editProgram.isMultiweek.toString()}
          onChange={(newValueStr) => {
            EditProgram.setIsMultiweek(props.dispatch, props.editProgram, newValueStr === "true");
          }}
        />
        <MenuItemEditable
          type="select"
          name="Next Day:"
          values={Program.getListOfDays(props.editProgram, props.settings)}
          value={props.editProgram.nextDay.toString()}
          onChange={(newValueStr) => {
            const newValue = newValueStr != null ? parseInt(newValueStr, 10) : undefined;
            if (newValue != null && !isNaN(newValue)) {
              const newDay = Math.max(1, Math.min(newValue, Program.numberOfDays(props.editProgram, props.settings)));
              EditProgram.setNextDay(props.dispatch, props.editProgram, newDay);
            }
          }}
        />
        {props.editProgram.isMultiweek && (
          <>
            <GroupHeader
              topPadding={true}
              name="Weeks"
              help={<span>Add days to weeks to build multi-week programs.</span>}
            />
            <DraggableList
              onDragEnd={(startIndex, endIndex) => {
                EditProgram.reorderWeeks(props.dispatch, props.programIndex, startIndex, endIndex);
              }}
              items={props.editProgram.weeks}
              element={(week, index, handleTouchStart) => {
                return (
                  <MenuItem
                    handleTouchStart={handleTouchStart}
                    name={week.name}
                    addons={
                      <ul className="ml-4 text-xs text-grayv2-main">
                        {week.days.map((day) => {
                          const programDay = props.editProgram.days.find((d) => d.id === day.id);
                          return <li className="list-disc">{programDay?.name}</li>;
                        })}
                      </ul>
                    }
                    value={
                      <>
                        <button
                          data-cy="edit-week"
                          className="px-2 align-middle ls-days-list-edit-week button"
                          onClick={() => {
                            updateState(props.dispatch, [
                              lb<IState>().pi("editProgram").p("weekIndex").record(index),
                              lb<IState>()
                                .p("screenStack")
                                .recordModify((screenStack) => Screen.push(screenStack, "editProgramWeek")),
                            ]);
                          }}
                        >
                          <IconEditSquare />
                        </button>
                        <button
                          data-cy="clone-week"
                          className="px-2 align-middle ls-days-list-copy-week button"
                          onClick={() => {
                            const newName = StringUtils.nextName(week.name);
                            props.dispatch({
                              type: "UpdateState",
                              lensRecording: [
                                lb<IState>()
                                  .p("storage")
                                  .p("programs")
                                  .i(props.programIndex)
                                  .p("weeks")
                                  .recordModify((weeks) => {
                                    const newWeeks = [...weeks];
                                    newWeeks.push({
                                      ...ObjectUtils.clone(week),
                                      name: newName,
                                      id: UidFactory.generateUid(8),
                                    });
                                    return newWeeks;
                                  }),
                              ],
                            });
                          }}
                        >
                          <IconDuplicate2 />
                        </button>
                        {props.editProgram.weeks.length > 1 && (
                          <button
                            data-cy={`menu-item-delete-${StringUtils.dashcase(week.name)}`}
                            className="px-2 align-middle ls-days-list-delete-week button"
                            onClick={() => {
                              if (confirm("Are you sure?")) {
                                props.dispatch({
                                  type: "UpdateState",
                                  lensRecording: [
                                    lb<IState>()
                                      .p("storage")
                                      .p("programs")
                                      .i(props.programIndex)
                                      .p("weeks")
                                      .recordModify((weeks) => weeks.filter((w) => w !== week)),
                                    lb<IState>()
                                      .p("storage")
                                      .p("programs")
                                      .i(props.programIndex)
                                      .p("deletedWeeks")
                                      .recordModify((dw) => [...(dw || []), week.id]),
                                  ],
                                });
                              }
                            }}
                          >
                            <IconTrash />
                          </button>
                        )}
                      </>
                    }
                  />
                );
              }}
            />
            <LinkButton
              name="add-week"
              className="mt-2"
              data-cy="add-week"
              onClick={() => {
                EditProgram.createWeek(props.dispatch, props.programIndex);
              }}
            >
              Add New Week
            </LinkButton>
          </>
        )}
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
                handleTouchStart={props.editProgram.isMultiweek ? undefined : handleTouchStart}
                name={day.name}
                addons={exerciseTypes.map((e) => (
                  <ExerciseImage settings={props.settings} exerciseType={e} size="small" className="w-6 mr-1" />
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
                                newDays.push({ ...day, name: newName, id: UidFactory.generateUid(8) });
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
                          EditProgram.deleteDay(props.dispatch, props.editProgram.id, day.id);
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
        <LinkButton
          name="edit-program-add-day"
          className="mt-2 mb-8"
          data-cy="add-day"
          onClick={() => props.dispatch({ type: "CreateDayAction" })}
        >
          Add New Day
        </LinkButton>
        <GroupHeader
          name="Exercises"
          help={
            <span>
              Exercises available in this program. You need to add them to <strong>days</strong> to make them appear in
              workouts. They could be reused in between days.
            </span>
          }
        />
        {props.editProgram.exercises.map((exercise) => {
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
                    data-cy="clone-exercise"
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
          name="edit-program-add-exercise"
          className="mt-2 mb-6"
          data-cy="add-exercise"
          onClick={() => EditProgram.addProgramExercise(props.dispatch, props.settings.units)}
        >
          Add New Exercise
        </LinkButton>
        {props.adminKey && (
          <div className="py-3 text-center">
            <Button
              name="publish-program"
              kind="orange"
              onClick={() => {
                setShouldShowPublishModal(true);
              }}
            >
              Publish
            </Button>
            <div className="mt-2">
              <Button
                name="migrate-program"
                kind="orange"
                onClick={() => {
                  console.log(new MigratorToPlanner(props.editProgram, props.settings).migrate());
                }}
              >
                Migrate
              </Button>
            </div>
          </div>
        )}
      </section>
    </Surface>
  );
}
