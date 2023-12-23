import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { DraggableList } from "../../components/draggableList";
import { ILensDispatch } from "../../utils/useLensReducer";
import { BuilderLinkInlineInput } from "../builder/components/builderInlineInput";
import { IProgramEditorState, IProgramEditorUiSelected } from "./models/types";
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
import { IProgramExercise } from "../../types";
import { UidFactory } from "../../utils/generator";
import { HtmlUtils } from "../../utils/html";
import { ProgramContentManageDaysModal } from "./components/programContentManageDaysModal";
import { ProgramContentEditWeeks } from "./components/programContentEditWeeks";
import { IconCloseCircleOutline } from "../../components/icons/iconCloseCircleOutline";
import { ProgramQrCode } from "../../components/programQrCode";
import { ProgramContentExport } from "./utils/programContentExport";
import { UrlUtils } from "../../utils/url";
import { Encoder } from "../../utils/encoder";
import { ProgramPreview } from "../../components/programPreview";
import { ProgramPreviewOrPlayground } from "../../components/programPreviewOrPlayground";

export interface IProgramContentProps {
  client: Window["fetch"];
  dispatch: ILensDispatch<IProgramEditorState>;
  state: IProgramEditorState;
  selected: IProgramEditorUiSelected[];
  isChangesWarningOn?: boolean;
  initialEncodedProgramUrl?: string;
  encodedProgramUrl?: string;
  onShowSettingsModal: () => void;
}

function selectExercise(
  dispatch: ILensDispatch<IProgramEditorState>,
  programExercise: IProgramExercise,
  dayIndex?: number
): void {
  dispatch(
    lb<IProgramEditorState>()
      .p("ui")
      .p("selected")
      .recordModify((selected) => {
        const newSelect = { dayIndex, exerciseId: programExercise.id };
        if (window.isPressingShiftCmdCtrl) {
          const hasExercise = selected.some((s) => s.exerciseId === programExercise.id && s.dayIndex === dayIndex);
          if (hasExercise) {
            return selected.filter((s) => s.exerciseId !== programExercise.id || s.dayIndex !== dayIndex);
          } else {
            const newSelected = selected.filter((s) => s.exerciseId !== programExercise.id);
            return [...newSelected, newSelect];
          }
        } else {
          return [newSelect];
        }
      })
  );
}

export function ProgramContentEditor(props: IProgramContentProps): JSX.Element {
  const { state, dispatch } = props;
  useUndoRedo(state, dispatch);

  const [showAddExistingExerciseModal, setShowAddExistingExerciseModal] = useState<number | undefined>(undefined);
  const [showManageDaysModal, setShowManageDaysModal] = useState<number | undefined>(undefined);
  const [collapsedDays, setCollapsedDays] = useState<boolean[]>([]);
  const [showClipboardInfo, setShowClipboardInfo] = useState<string | undefined>(undefined);

  const program = state.current.program;
  const editExercises = state.current.editExercises;
  const assignedExerciseIds = new Set(program.days.flatMap((d) => d.exercises.map((e) => e.id)));
  const unassignedExercises = program.exercises.filter((e) => !assignedExerciseIds.has(e.id));
  const lbProgram = lb<IProgramEditorState>().p("current").p("program");
  const lbEditExercises = lb<IProgramEditorState>().p("current").p("editExercises");
  const lbExamples = state.ui.showExamplesForExerciseKey
    ? lbEditExercises.pi(state.ui.showExamplesForExerciseKey)
    : undefined;
  const [clearHasChanges, setClearHasChanges] = useState<boolean>(false);
  const hasChanges =
    props.isChangesWarningOn &&
    props.encodedProgramUrl != null &&
    props.initialEncodedProgramUrl != null &&
    props.encodedProgramUrl !== props.initialEncodedProgramUrl;
  return (
    <section className="px-4 py-2">
      {hasChanges && !clearHasChanges && (
        <div className="fixed top-0 left-0 z-50 w-full text-xs text-center border-b bg-redv2-200 border-redv2-500 text-redv2-main">
          Made changes to the program, but the link still goes to the original version. If you want to share updated
          version, generate a new link.
          <button className="p-2 align-middle nm-clear-has-changes" onClick={() => setClearHasChanges(true)}>
            <IconCloseCircleOutline size={14} />
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row">
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h1 className="flex-1 pb-4 mr-2 text-2xl font-bold">
              <div>
                <BuilderLinkInlineInput
                  value={program.name}
                  onInputString={(v) => {
                    dispatch(lbProgram.p("name").record(v));
                    document.title = `Liftosaur: Weight Lifting Tracking App | ${HtmlUtils.escapeHtml(v)}`;
                  }}
                />
              </div>
              <button
                className="text-xs font-normal text-grayv2-main nm-program-content-change-id"
                style={{ marginTop: "-0.5rem" }}
                onClick={() => props.dispatch(lbProgram.p("id").record(UidFactory.generateUid(8)))}
              >
                id: {program.id}
              </button>
            </h1>
            <div className="flex">
              {(props.encodedProgramUrl || props.initialEncodedProgramUrl) && (
                <BuilderCopyLink
                  type="p"
                  program={program}
                  client={props.client}
                  suppressShowInfo={true}
                  onShowInfo={(url) => {
                    props.dispatch(
                      lb<IProgramEditorState>()
                        .p("initialEncodedProgramUrl")
                        .record(props.encodedProgramUrl || props.initialEncodedProgramUrl)
                    );
                    // Add new URL to the browser history
                    if (url !== window.location.href) {
                      window.history.pushState({}, document.title, url);
                    }
                    setShowClipboardInfo(url);
                  }}
                  encodedProgram={async () => {
                    let encodedProgram = props.encodedProgramUrl || props.initialEncodedProgramUrl;
                    if (!encodedProgram) {
                      const exportedProgram = ProgramContentExport.generateExportedProgram(state);
                      const baseUrl = UrlUtils.build("/program", window.location.href);
                      const encodedUrl = await Encoder.encodeIntoUrl(
                        JSON.stringify(exportedProgram),
                        baseUrl.toString()
                      );
                      encodedProgram = encodedUrl.toString();
                    }
                    return encodedProgram;
                  }}
                />
              )}
              <button title="Settings" className="p-2" onClick={() => props.onShowSettingsModal()}>
                <IconCog2 />
              </button>
              <button
                style={{ cursor: canUndo(state) ? "pointer" : "default" }}
                title="Undo"
                className="p-2 nm-program-content-undo"
                disabled={!canUndo(state)}
                onClick={() => undo(dispatch, state)}
              >
                <IconUndo color={!canUndo(state) ? "#BAC4CD" : "#171718"} />
              </button>
              <button
                style={{ cursor: canRedo(state) ? "pointer" : "default" }}
                title="Redo"
                className="p-2 nm-program-content-redo"
                disabled={!canRedo(state)}
                onClick={() => redo(dispatch, state)}
              >
                <IconUndo style={{ transform: "scale(-1,  1)" }} color={!canRedo(state) ? "#BAC4CD" : "#171718"} />
              </button>
            </div>
          </div>
          {showClipboardInfo && (
            <div className="text-xs text-right text-grayv2-main">
              <div>
                Copied to clipboard:{" "}
                <a target="_blank" className="font-bold underline text-bluev2" href={showClipboardInfo}>
                  {showClipboardInfo}
                </a>
              </div>
              <div>
                <ProgramQrCode url={showClipboardInfo} />
              </div>
            </div>
          )}
          <GroupHeader leftExpandIcon={true} size="large" name="Program preview" isExpanded={true}>
            <ProgramPreviewOrPlayground program={program} settings={state.settings} isMobile={false} />
          </GroupHeader>
          {program.isMultiweek && (
            <ProgramContentEditWeeks
              program={program}
              dispatch={dispatch}
              onShowManageDaysModal={setShowManageDaysModal}
              settings={state.settings}
            />
          )}
          <DraggableList
            hideBorders={true}
            items={program.days}
            element={(day, i, handleTouchStart) => {
              const dayData = Program.getDayData(program, i + 1);
              const approxDayTime = TimeUtils.formatHHMM(Program.dayApproxTimeMs(dayData, program, state.settings));
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
                          className="w-8 p-2 mr-1 text-center nm-web-editor-expand-collapse-day"
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
                                newDays.push({
                                  ...ObjectUtils.clone(day),
                                  name: newName,
                                  id: UidFactory.generateUid(8),
                                });
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
                              dispatch(EditProgramLenses.deleteDay(lbProgram, day.id));
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
                                  onSelect={() => selectExercise(dispatch, programExercise, i)}
                                  selected={props.selected}
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
                          <LinkButton
                            name="program-content-add-existing-exercise"
                            onClick={() => setShowAddExistingExerciseModal(i)}
                          >
                            Add existing exercise to {day.name}
                          </LinkButton>
                          <LinkButton
                            name="program-content-create-new-exercise-in-day"
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
            name="program-content-add-new-day"
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
                      onSelect={() => selectExercise(dispatch, programExercise)}
                      selected={props.selected}
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
      {showManageDaysModal != null && (
        <ProgramContentManageDaysModal
          onClose={() => setShowManageDaysModal(undefined)}
          program={program}
          weekIndex={showManageDaysModal}
          dispatch={dispatch}
        />
      )}
      {lbExamples && (
        <ProgramContentModalExerciseExamples unit={state.settings.units} dispatch={dispatch} lbe={lbExamples!} />
      )}
    </section>
  );
}
