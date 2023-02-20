import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { DraggableList } from "../../components/draggableList";
import { useLensReducer } from "../../utils/useLensReducer";
import { BuilderLinkInlineInput } from "../builder/components/builderInlineInput";
import { IProgramEditorState } from "./models/types";
import { IconWatch } from "../../components/icons/iconWatch";
import { TimeUtils } from "../../utils/time";
import { IExportedProgram, Program } from "../../models/program";
import { Settings } from "../../models/settings";
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
import { Encoder } from "../../utils/encoder";
import { undo, undoRedoMiddleware, useUndoRedo, canUndo, canRedo, redo } from "../builder/utils/undoredo";
import { IconUndo } from "../../components/icons/iconUndo";
import { IconArrowDown2 } from "../../components/icons/iconArrowDown2";
import { IconArrowRight } from "../../components/icons/iconArrowRight";
import { IconTrash } from "../../components/icons/iconTrash";
import { CollectionUtils } from "../../utils/collection";
import { BuilderCopyLink } from "../builder/components/builderCopyLink";
import { getLatestMigrationVersion } from "../../migrations/migrations";
import { UidFactory } from "../../utils/generator";
import { ProgramContentMuscles } from "./components/programContentMuscles";
import { dequal } from "dequal";
import { IconCog2 } from "../../components/icons/iconCog2";
import { ProgramContentModalSettings } from "./components/programContentModalSettings";
import { EditExerciseUtil } from "./utils/editExerciseUtil";

export interface IProgramContentProps {
  client: Window["fetch"];
  exportedProgram?: IExportedProgram;
}

export function ProgramContent(props: IProgramContentProps): JSX.Element {
  const defaultSettings = Settings.build();
  const initialState: IProgramEditorState = {
    settings: {
      ...defaultSettings,
      exercises: { ...defaultSettings.exercises, ...props.exportedProgram?.customExercises },
    },
    current: {
      program: props.exportedProgram?.program || {
        id: UidFactory.generateUid(8),
        name: "My Program",
        url: "",
        author: "",
        shortDescription: "",
        description: "",
        nextDay: 1,
        days: [{ name: "Day 1", exercises: [] }],
        exercises: [],
        tags: [],
      },
      editExercises: {},
    },
    history: {
      past: [],
      future: [],
    },
  };
  const [state, dispatch] = useLensReducer(initialState, { client: props.client }, [
    async (action, oldState, newState) => {
      if (oldState.current.program !== newState.current.program) {
        const exportedProgram: IExportedProgram = {
          program: newState.current.program,
          customExercises: newState.settings.exercises,
          version: getLatestMigrationVersion(),
        };
        await Encoder.encodeIntoUrlAndSetUrl(JSON.stringify(exportedProgram));
      }
    },
    async (action, oldState, newState) => {
      // if ("type" in action && action.type === "Update") {
      //   console.log(action.lensRecording[0], action.desc);
      // }
      if (
        !(
          "type" in action &&
          action.type === "Update" &&
          (action.desc === "undo" || action.desc === "ensureReuseLogic" || action.desc === "setDefaultWarmupSets")
        ) &&
        oldState.current !== newState.current
      ) {
        undoRedoMiddleware(dispatch, oldState);
      }
    },
  ]);
  useUndoRedo(state, dispatch);

  const [showAddExistingExerciseModal, setShowAddExistingExerciseModal] = useState<number | undefined>(undefined);
  const [collapsedDays, setCollapsedDays] = useState<boolean[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const program = state.current.program;
  const editExercises = state.current.editExercises;
  const assignedExerciseIds = new Set(program.days.flatMap((d) => d.exercises.map((e) => e.id)));
  const unassignedExercises = program.exercises.filter((e) => !assignedExerciseIds.has(e.id));
  const lbProgram = lb<IProgramEditorState>().p("current").p("program");
  const lbEditExercises = lb<IProgramEditorState>().p("current").p("editExercises");
  return (
    <section className="px-4 py-2">
      <div className="flex">
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
              <BuilderCopyLink msg="Copied the link with this program to the clipboard" />
              <button title="Settings" className="p-2" onClick={() => setShowSettingsModal(true)}>
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
                      {program.days.length > 1 && (
                        <button
                          title="Remove day"
                          data-cy={`menu-item-delete-${StringUtils.dashcase(day.name)}`}
                          className="px-2 align-middle ls-days-list-delete-day button"
                          onClick={() => {
                            dispatch(lbProgram.p("days").recordModify((days) => CollectionUtils.removeAt(days, i)));
                            setCollapsedDays(CollectionUtils.removeAt(collapsedDays, i));
                          }}
                        >
                          <IconTrash />
                        </button>
                      )}
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
                              const newExercise = Program.createExercise();
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
      <ProgramContentModalSettings
        isHidden={!showSettingsModal}
        settings={state.settings}
        dispatch={dispatch}
        onClose={() => setShowSettingsModal(false)}
      />
    </section>
  );
}
