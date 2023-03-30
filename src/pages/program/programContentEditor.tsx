import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { DraggableList } from "../../components/draggableList";
import { ILensDispatch } from "../../utils/useLensReducer";
import { BuilderLinkInlineInput } from "../builder/components/builderInlineInput";
import { IProgramEditorState } from "./models/types";
import { IconWatch } from "../../components/icons/iconWatch";
import { TimeUtils } from "../../utils/time";
import { Program } from "../../models/program";
import { IconHandle } from "../../components/icons/iconHandle";
import { EditProgramLenses } from "../../models/editProgramLenses";
import { LinkButton } from "../../components/linkButton";
import { StringUtils } from "../../utils/string";
import { ProgramContentExercise } from "./components/programContentExercise";
import { ProgramContentEditExercise } from "./components/programContentEditExercise";
import { GroupHeader } from "../../components/groupHeader";
import { useState } from "preact/hooks";
import { ObjectUtils } from "../../utils/object";
import { ProgramContentModalExistingExercise } from "./components/programContentModalExistingExercise";
import { undo, useUndoRedo, canUndo, canRedo, redo } from "../builder/utils/undoredo";
import { IconUndo } from "../../components/icons/iconUndo";
import { IconArrowDown2 } from "../../components/icons/iconArrowDown2";
import { IconArrowRight } from "../../components/icons/iconArrowRight";
import { IconTrash } from "../../components/icons/iconTrash";
import { CollectionUtils } from "../../utils/collection";
import { BuilderCopyLink } from "../builder/components/builderCopyLink";
import { ProgramContentMuscles } from "./components/programContentMuscles";
import { dequal } from "dequal";
import { IconCog2 } from "../../components/icons/iconCog2";
import { EditExerciseUtil } from "./utils/editExerciseUtil";
import { ProgramContentModalExerciseExamples } from "./components/programContentModalExerciseExamples";
import { IconDuplicate2 } from "../../components/icons/iconDuplicate2";

export interface IProgramContentProps {
  client: Window["fetch"];
  dispatch: ILensDispatch<IProgramEditorState>;
  state: IProgramEditorState;
  onShowSettingsModal: () => void;
}

export function ProgramContentEditor(props: IProgramContentProps): JSX.Element {
  const { state, dispatch } = props;
  useUndoRedo(state, dispatch);

  const [showAddExistingExerciseModal, setShowAddExistingExerciseModal] = useState<number | undefined>(undefined);
  const [collapsedDays, setCollapsedDays] = useState<boolean[]>([]);

  const program = state.current.program;
  const editExercises = state.current.editExercises;
  const assignedExerciseIds = new Set(program.days.flatMap((d) => d.exercises.map((e) => e.id)));
  const unassignedExercises = program.exercises.filter((e) => !assignedExerciseIds.has(e.id));
  const lbProgram = lb<IProgramEditorState>().p("current").p("program");
  const lbEditExercises = lb<IProgramEditorState>().p("current").p("editExercises");
  const lbExamples = state.ui.showExamplesForExerciseKey
    ? lbEditExercises.pi(state.ui.showExamplesForExerciseKey)
    : undefined;
  return (
    <section className="px-4 py-2">
      <div className="flex flex-col sm:flex-row">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h1 className="flex-1 pb-4 mr-2 text-2xl font-bold">
              <div>
                <BuilderLinkInlineInput
                  value={program.name}
                  onInputString={(v) => {
                    dispatch(lbProgram.p("name").record(v));
                  }}
                />
              </div>
              <div className="text-xs font-normal text-grayv2-main" style={{ marginTop: "-0.5rem" }}>
                id: {program.id}
              </div>
            </h1>
            <div className="flex">
              <BuilderCopyLink
                type="p"
                program={program}
                client={props.client}
                msg="Copied the link with this program to the clipboard"
              />
              <button title="Settings" className="p-2" onClick={() => props.onShowSettingsModal()}>
                <IconCog2 />
              </button>
              <button
                style={{ cursor: canUndo(state) ? "pointer" : "default" }}
                title="Undo"
                className="p-2"
                disabled={!canUndo(state)}
                onClick={() => undo(dispatch, state)}
              >
                <IconUndo color={!canUndo(state) ? "#BAC4CD" : "#171718"} />
              </button>
              <button
                style={{ cursor: canRedo(state) ? "pointer" : "default" }}
                title="Redo"
                className="p-2"
                disabled={!canRedo(state)}
                onClick={() => redo(dispatch, state)}
              >
                <IconUndo style={{ transform: "scale(-1,  1)" }} color={!canRedo(state) ? "#BAC4CD" : "#171718"} />
              </button>
            </div>
          </div>
          <DraggableList
            hideBorders={true}
            items={program.days}
            element={(day, i, handleTouchStart) => {
              const approxDayTime = TimeUtils.formatHHMM(Program.dayApproxTimeMs(i, program, state.settings));
              return (
                <section className="flex w-full px-2 py-1 text-left">
                  <div className="flex flex-col">
                    <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                      <span onMouseDown={handleTouchStart} onTouchStart={handleTouchStart}>
                        <IconHandle />
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-full bg-grayv2-200" style={{ width: "1px" }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex">
                      <h2 className="flex items-center flex-1 mr-2" style={{ height: "2.25rem" }}>
                        <button
                          title={collapsedDays[i] ? "Expand day" : "Collapse day"}
                          onClick={() => {
                            const newCollapsedDays = [...collapsedDays];
                            newCollapsedDays[i] = !newCollapsedDays[i];
                            setCollapsedDays(newCollapsedDays);
                          }}
                          className="w-8 p-2 mr-1 text-center"
                        >
                          {collapsedDays[i] ? (
                            <IconArrowRight className="inline-block" />
                          ) : (
                            <IconArrowDown2 className="inline-block" />
                          )}
                        </button>
                        <span className="text-xl">
                          <BuilderLinkInlineInput
                            value={day.name}
                            onInputString={(v) => {
                              dispatch(lbProgram.p("days").i(i).p("name").record(v));
                            }}
                          />
                        </span>
                        <span className="mx-4 text-grayv2-main">{day.exercises.length} exercises</span>
                        <div className="text-grayv2-main">
                          <IconWatch className="mb-1 align-middle" />
                          <span className="pl-1 font-bold align-middle">{approxDayTime}</span>
                        </div>
                      </h2>
                      <div>
                        <button
                          title="Duplicate day"
                          data-cy={`menu-item-duplicate-day-${StringUtils.dashcase(day.name)}`}
                          className="px-2 align-middle ls-web-editor-duplicate-day button"
                          onClick={() => {
                            const newName = `${day.name} Copy`;
                            dispatch(
                              lbProgram.p("days").recordModify((days) => {
                                const newDays = [...days];
                                newDays.push({ ...ObjectUtils.clone(day), name: newName });
                                return newDays;
                              })
                            );
                          }}
                        >
                          <IconDuplicate2 />
                        </button>
                        {program.days.length > 1 && (
                          <button
                            title="Remove day"
                            data-cy={`menu-item-delete-${StringUtils.dashcase(day.name)}`}
                            className="px-2 align-middle ls-web-editor-delete-day button"
                            onClick={() => {
                              dispatch(lbProgram.p("days").recordModify((days) => CollectionUtils.removeAt(days, i)));
                              setCollapsedDays(CollectionUtils.removeAt(collapsedDays, i));
                            }}
                          >
                            <IconTrash />
                          </button>
                        )}
                      </div>
                    </div>
                    {!collapsedDays[i] && (
                      <div>
                        <DraggableList
                          hideBorders={true}
                          items={day.exercises}
                          element={(dayExercise, i2, handleTouchStart2) => {
                            const programExercise = Program.getProgramExerciseById(program, dayExercise.id);
                            if (!programExercise) {
                              return <></>;
                            }
                            const editProgramExercise = editExercises[EditExerciseUtil.getKey(programExercise.id, i)];
                            if (editProgramExercise) {
                              const isChanged = !dequal(editProgramExercise, programExercise);
                              return (
                                <ProgramContentEditExercise
                                  isChanged={isChanged}
                                  dayIndex={i}
                                  programExercise={editProgramExercise}
                                  program={program}
                                  settings={state.settings}
                                  dispatch={dispatch}
                                />
                              );
                            } else {
                              return (
                                <ProgramContentExercise
                                  programExercise={programExercise}
                                  dayIndex={i}
                                  handleTouchStart={handleTouchStart2}
                                  program={program}
                                  settings={state.settings}
                                  onEdit={() => {
                                    dispatch(
                                      lbEditExercises
                                        .p(EditExerciseUtil.getKey(programExercise.id, i))
                                        .record(ObjectUtils.clone(programExercise))
                                    );
                                  }}
                                  onDelete={() => {
                                    dispatch(EditProgramLenses.toggleDayExercise(lbProgram, i, programExercise.id));
                                  }}
                                  onCopy={() => {
                                    dispatch(EditProgramLenses.copyProgramExercise(lbProgram, programExercise, i));
                                  }}
                                />
                              );
                            }
                          }}
                          onDragEnd={(startIndex, endIndex) =>
                            dispatch(EditProgramLenses.reorderExercises(lbProgram, i, startIndex, endIndex))
                          }
                        />
                        <div>
                          <LinkButton onClick={() => setShowAddExistingExerciseModal(i)}>
                            Add existing exercise to {day.name}
                          </LinkButton>
                          <LinkButton
                            className="ml-8"
                            onClick={() => {
                              const newExercise = Program.createExercise(state.settings.units);
                              dispatch([
                                lbProgram.p("exercises").recordModify((ex) => {
                                  return [...ex, newExercise];
                                }),
                                EditProgramLenses.toggleDayExercise(lbProgram, i, newExercise.id),
                                lbEditExercises
                                  .p(EditExerciseUtil.getKey(newExercise.id, i))
                                  .record(ObjectUtils.clone(newExercise)),
                              ]);
                            }}
                          >
                            Create new exercise in {day.name}
                          </LinkButton>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            }}
            onDragEnd={(startIndex, endIndex) => {
              dispatch(EditProgramLenses.reorderDays(lbProgram, startIndex, endIndex));
              const newCollapsedDays = [...collapsedDays];
              const oldStartDayIndex = newCollapsedDays[startIndex];
              newCollapsedDays[startIndex] = newCollapsedDays[endIndex];
              newCollapsedDays[endIndex] = oldStartDayIndex;
              setCollapsedDays(newCollapsedDays);
            }}
          />
          <LinkButton
            onClick={() => {
              dispatch(
                lbProgram.p("days").recordModify((days) => {
                  return [...days, Program.createDay(StringUtils.nextName(program.days[program.days.length - 1].name))];
                })
              );
            }}
          >
            Add new day
          </LinkButton>
          {unassignedExercises.length > 0 && (
            <div>
              <GroupHeader topPadding={true} name="Unassigned exercises" />
              {unassignedExercises.map((programExercise) => {
                const editProgramExercise = editExercises[EditExerciseUtil.getKey(programExercise.id)];
                if (editProgramExercise) {
                  const isChanged = !dequal(editProgramExercise, programExercise);
                  return (
                    <ProgramContentEditExercise
                      isChanged={isChanged}
                      programExercise={editProgramExercise}
                      program={program}
                      settings={state.settings}
                      dispatch={dispatch}
                    />
                  );
                } else {
                  return (
                    <ProgramContentExercise
                      programExercise={programExercise}
                      program={program}
                      settings={state.settings}
                      onEdit={() => {
                        dispatch(
                          lbEditExercises
                            .p(EditExerciseUtil.getKey(programExercise.id))
                            .record(ObjectUtils.clone(programExercise))
                        );
                      }}
                      onDelete={() => {
                        dispatch(EditProgramLenses.removeProgramExercise(lbProgram, programExercise.id));
                      }}
                      onCopy={() => {
                        dispatch(EditProgramLenses.copyProgramExercise(lbProgram, programExercise));
                      }}
                    />
                  );
                }
              })}
            </div>
          )}
        </div>
        <div className="w-64">
          <div className="sticky top-0 self-start">
            <ProgramContentMuscles program={program} settings={state.settings} />
          </div>
        </div>
      </div>
      <ProgramContentModalExistingExercise
        dayIndex={showAddExistingExerciseModal || 0}
        onChange={(value) => {
          if (value && showAddExistingExerciseModal != null) {
            dispatch(EditProgramLenses.toggleDayExercise(lbProgram, showAddExistingExerciseModal, value));
          }
          setShowAddExistingExerciseModal(undefined);
        }}
        isHidden={showAddExistingExerciseModal == null}
        program={program}
        settings={state.settings}
      />
      {lbExamples && (
        <ProgramContentModalExerciseExamples unit={state.settings.units} dispatch={dispatch} lbe={lbExamples!} />
      )}
    </section>
  );
}
