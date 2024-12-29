/* eslint-disable @typescript-eslint/ban-types */
import React, { JSX } from "react";
import { EditProgramStateVariables } from "../../../components/editProgram/editProgramStateVariables";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { IProgramExercise, ISettings, IHistoryRecord, IProgram, IUnit } from "../../../types";
import { EditProgramLenses } from "../../../models/editProgramLenses";
import { LensBuilder, lbu, lb } from "lens-shmens";
import { ProgramContentPlayground } from "./programContentPlayground";
import { useEffect, useRef, useState } from "react";
import { LinkButton } from "../../../components/linkButton";
import { EditProgramVariationsEditor } from "../../../components/editProgram/editProgramVariationsEditor";
import { EditProgramWarmupSets } from "../../../components/editProgram/editProgramWarmupSets";
import { EditProgramSets } from "../../../components/editProgram/editProgramSets";
import { EditProgramFinishDayScriptEditor } from "../../../components/editProgram/editProgramFinishDayScriptEditor";
import { ModalAddStateVariable } from "../../../components/editProgram/modalAddStateVariable";
import { MenuItemValue } from "../../../components/menuItemEditable";
import { Program } from "../../../models/program";
import { IEither } from "../../../utils/types";
import { Button } from "../../../components/button";
import { CollectionUtils } from "../../../utils/collection";
import { EditExerciseUtil } from "../utils/editExerciseUtil";
import { EditProgramExtraFeatures } from "../../../components/editProgram/editProgramExtraFeatures";
import { ProgramExercise } from "../../../models/programExercise";
import { EditProgramExerciseAdvancedDescriptions } from "../../../components/editProgram/editProgramExerciseDescription";
import { Progress } from "../../../models/progress";

interface IProgramContentEditExerciseAdvancedProps {
  dispatch: ILensDispatch<IProgramEditorState>;
  programExercise: IProgramExercise;
  program: IProgram;
  dayIndex?: number;
  settings: ISettings;
  lbe: LensBuilder<IProgramEditorState, IProgramExercise, {}>;
  progress?: IHistoryRecord;
  isChanged: boolean;
  onProgressChange: (progress: IHistoryRecord) => void;
}

export function ProgramContentEditExerciseAdvanced(props: IProgramContentEditExerciseAdvancedProps): JSX.Element {
  const { programExercise, progress, program, lbe } = props;
  const allProgramExercises = program.exercises;
  const areVariationsEnabled = programExercise.variations.length > 1;
  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const entry = progress?.entries[0];
  const dayData = progress ? Progress.getDayData(progress) : { day: 1 };
  const state = ProgramExercise.getState(programExercise, allProgramExercises);

  const finishScriptResult =
    entry != null
      ? Program.runExerciseFinishDayScript(
          entry,
          dayData,
          props.settings,
          state,
          programExercise,
          program,
          Program.programMode(program)
        )
      : Program.parseExerciseFinishDayScript(dayData, props.settings, state, programExercise.finishDayExpr);
  const finishEditorResult: IEither<number | undefined, string> = finishScriptResult.success
    ? { success: true, data: undefined }
    : finishScriptResult;

  const variationScriptResult = Program.runVariationScript(
    programExercise,
    allProgramExercises,
    state,
    dayData,
    props.settings
  );
  const stateMetadata = ProgramExercise.getStateMetadata(programExercise, allProgramExercises);

  const [areExtraFeaturesValid, setAreExtraFeaturesValid] = useState<boolean>(true);

  const isSaveDisabled =
    !entry || !finishEditorResult.success || !variationScriptResult.success || !areExtraFeaturesValid;

  const isReusingDescription = ProgramExercise.isDescriptionReused(programExercise);

  return (
    <section ref={containerRef}>
      <div className="my-2 text-sm text-grayv2-main">
        Need inspiration? Check out{" "}
        <LinkButton
          name="program-content-show-examples"
          className="cursor-pointer"
          onClick={() =>
            props.dispatch(
              lb<IProgramEditorState>()
                .p("ui")
                .p("showExamplesForExerciseKey")
                .record(EditExerciseUtil.getKey(programExercise.id, props.dayIndex))
            )
          }
        >
          examples
        </LinkButton>{" "}
        of different exercise logic
      </div>
      {isReusingDescription && (
        <div className="text-sm font-bold text-grayv2-main">
          Reusing description from {ProgramExercise.getProgramExercise(programExercise, allProgramExercises).name}
        </div>
      )}
      <EditProgramExerciseAdvancedDescriptions
        programExercise={programExercise}
        allProgramExercises={allProgramExercises}
        dayData={dayData}
        settings={props.settings}
        onAdd={() => props.dispatch(EditProgramLenses.addDescription(lbe))}
        onRemove={(index) => props.dispatch(EditProgramLenses.removeDescription(lbe, index))}
        onChange={(value, index) => props.dispatch(EditProgramLenses.changeDescription(lbe, value, index))}
        onChangeExpr={(value) => props.dispatch(EditProgramLenses.changeDescriptionExpr(lbe, value))}
        onReorder={(startIndex, endIndex) =>
          props.dispatch(EditProgramLenses.reorderDescriptions(lbe, startIndex, endIndex))
        }
      />
      <div className="flex" style={{ gap: "1rem" }}>
        <div className="flex-1">
          <EditProgramStateVariables
            stateMetadata={stateMetadata}
            programExercise={programExercise}
            settings={props.settings}
            onEditStateVariable={(stateKey, newValue) => {
              const reuseLogicId = programExercise.reuseLogic?.selected;
              if (reuseLogicId) {
                props.dispatch(EditProgramLenses.editReuseLogicStateVariable(lbe, reuseLogicId, stateKey, newValue));
              } else {
                if (newValue == null) {
                  props.dispatch(EditProgramLenses.removeStateVariableMetadata(lbe, stateKey));
                }
                props.dispatch(EditProgramLenses.editStateVariable(lbe, stateKey, newValue));
              }
            }}
            onAddStateVariable={() => {
              setShouldShowAddStateVariable(true);
            }}
            onChangeStateVariableUnit={() => {
              props.dispatch(EditProgramLenses.switchStateVariablesToUnit(lbe, props.settings));
            }}
          />
        </div>
        <div className="flex-1">
          {progress && entry && (
            <ProgramContentPlayground
              dayData={dayData}
              programExercise={programExercise}
              program={program}
              progress={progress}
              settings={props.settings}
              lbe={props.lbe}
              dispatch={props.dispatch}
              onProgressChange={props.onProgressChange}
            />
          )}
        </div>
      </div>

      <div>
        <ReuseLogic
          programExercise={programExercise}
          dispatch={props.dispatch}
          lbe={lbe}
          allProgramExercises={allProgramExercises}
        />
      </div>

      {!programExercise.reuseLogic?.selected ? (
        <>
          {programExercise.variations.map((_, variationIndex) => {
            return (
              <EditProgramSets
                variationIndex={variationIndex}
                settings={props.settings}
                dayData={dayData}
                programExercise={programExercise}
                onChangeLabel={(variation: number, setIndex: number, label: string) => {
                  props.dispatch(EditProgramLenses.setLabel(lbe, label, variation, setIndex));
                }}
                onChangeMinReps={(reps: string, variation: number, setIndex: number) => {
                  props.dispatch(EditProgramLenses.setMinReps(lbe, reps, variation, setIndex));
                }}
                onChangeReps={(reps: string, variation: number, setIndex: number) => {
                  props.dispatch(EditProgramLenses.setReps(lbe, reps, variation, setIndex));
                }}
                onChangeRpe={(rpe: string, variation: number, setIndex: number) => {
                  props.dispatch(EditProgramLenses.setRpe(lbe, rpe, variation, setIndex));
                }}
                onChangeAmrap={(isSet: boolean, variation: number, setIndex: number) => {
                  props.dispatch(EditProgramLenses.setAmrap(lbe, isSet, variation, setIndex));
                }}
                onChangeLogRpe={(isSet: boolean, variation: number, setIndex: number) => {
                  props.dispatch(EditProgramLenses.setLogRpe(lbe, isSet, variation, setIndex));
                }}
                onChangeWeight={(weight: string, variation: number, setIndex: number) => {
                  props.dispatch(EditProgramLenses.setWeight(lbe, weight, variation, setIndex));
                }}
                onRemoveSet={(variation: number, setIndex: number) => {
                  props.dispatch(EditProgramLenses.removeSet(lbe, variation, setIndex));
                }}
                onReorderSets={(variation: number, startIndex: number, endIndex: number) => {
                  props.dispatch(EditProgramLenses.reorderSets(lbe, variation, startIndex, endIndex));
                }}
                onAddSet={(variation: number) => {
                  props.dispatch(EditProgramLenses.addSet(lbe, variation));
                }}
                onDeleteVariation={
                  areVariationsEnabled
                    ? (variation: number) => {
                        props.dispatch(EditProgramLenses.removeVariation(lbe, variation));
                      }
                    : undefined
                }
                onDuplicateVariation={
                  areVariationsEnabled
                    ? (variation: number) => {
                        props.dispatch(EditProgramLenses.duplicateVariation(lbe, variation));
                      }
                    : undefined
                }
              />
            );
          })}
          {areVariationsEnabled && (
            <LinkButton
              name="program-content-add-variation"
              className="my-4"
              onClick={() => props.dispatch(EditProgramLenses.addVariation(lbe))}
            >
              Add Variation
            </LinkButton>
          )}
          {areVariationsEnabled && (
            <EditProgramVariationsEditor
              programExercise={programExercise}
              editorResult={variationScriptResult}
              onChange={(value) => {
                props.dispatch(EditProgramLenses.setExerciseVariationExpr(lbe, value));
              }}
            />
          )}
          <div className="pt-8">
            <EditProgramWarmupSets
              programExercise={programExercise}
              settings={props.settings}
              onAddWarmupSet={(warmupSets) => {
                props.dispatch(EditProgramLenses.addWarmupSet(lbe, warmupSets, props.settings.units));
              }}
              onRemoveWarmupSet={(warmupSets, index) => {
                props.dispatch(EditProgramLenses.removeWarmupSet(lbe, warmupSets, index));
              }}
              onUpdateWarmupSet={(warmupSets, index, newWarmupSet) => {
                props.dispatch(EditProgramLenses.updateWarmupSet(lbe, warmupSets, index, newWarmupSet));
              }}
              onSetDefaultWarmupSets={(ex) => {
                props.dispatch(
                  EditProgramLenses.setDefaultWarmupSets(lbe, ex, props.settings.units),
                  "setDefaultWarmupSets"
                );
              }}
            />
          </div>
          <EditProgramExtraFeatures
            dayData={dayData}
            settings={props.settings}
            programExercise={programExercise}
            entry={entry}
            onChangeQuickAddSets={(value) => {
              props.dispatch(EditProgramLenses.setQuickAddSets(lbe, value));
            }}
            onChangeEnableRpe={(enableRpe) => {
              props.dispatch(EditProgramLenses.setEnableRpe(lbe, enableRpe));
            }}
            onChangeEnableRepRanges={(enableRepRanges) => {
              props.dispatch(EditProgramLenses.setEnableRepRanges(lbe, enableRepRanges));
            }}
            onValid={(isValid) => {
              setAreExtraFeaturesValid(isValid);
            }}
            areVariationsEnabled={areVariationsEnabled}
            onEnableVariations={() => {
              props.dispatch(EditProgramLenses.addVariation(lbe));
            }}
            onChangeTimer={(expr) => {
              props.dispatch(EditProgramLenses.setTimer(lbe, expr));
            }}
          />
          <EditProgramFinishDayScriptEditor
            programExercise={programExercise}
            editorResult={finishEditorResult}
            onSetFinishDayExpr={(expr) => {
              props.dispatch(EditProgramLenses.setExerciseFinishDayExpr(lbe, expr));
            }}
          />
        </>
      ) : (
        <EditProgramWarmupSets
          programExercise={programExercise}
          settings={props.settings}
          onAddWarmupSet={(warmupSets) => {
            props.dispatch(EditProgramLenses.addWarmupSet(lbe, warmupSets, props.settings.units));
          }}
          onRemoveWarmupSet={(warmupSets, index) => {
            props.dispatch(EditProgramLenses.removeWarmupSet(lbe, warmupSets, index));
          }}
          onUpdateWarmupSet={(warmupSets, index, newWarmupSet) => {
            props.dispatch(EditProgramLenses.updateWarmupSet(lbe, warmupSets, index, newWarmupSet));
          }}
          onSetDefaultWarmupSets={(ex) => {
            props.dispatch(
              EditProgramLenses.setDefaultWarmupSets(lbe, ex, props.settings.units),
              "setDefaultWarmupSets"
            );
          }}
        />
      )}
      <ModalAddStateVariable
        isHidden={!shouldShowAddStateVariable}
        onDone={(newName, newType, newUserPrompted) => {
          if (newName != null && newType != null) {
            props.dispatch(EditProgramLenses.addStateVariable(lbe, newName, newType as IUnit, newUserPrompted));
          }
          setShouldShowAddStateVariable(false);
        }}
      />

      <div className="p-2 mb-4 text-center">
        <Button
          name="cancel-edit-exercise-advanced"
          className="mr-2"
          onClick={() => {
            if (
              !props.isChanged ||
              confirm("Are you sure? If you cancel, all your changes in this exercise would be lost")
            ) {
              const container = containerRef.current;
              if (container) {
                window.scrollBy(0, -container.clientHeight);
              }
              props.dispatch([
                lb<IProgramEditorState>()
                  .p("current")
                  .p("editExercises")
                  .p(EditExerciseUtil.getKey(programExercise.id, props.dayIndex))
                  .record(undefined),
              ]);
            }
          }}
          kind="grayv2"
        >
          Cancel
        </Button>
        <Button
          name="save-edit-exercise-advanced"
          onClick={() => {
            if (!isSaveDisabled) {
              setTimeout(() => {
                const container = containerRef.current;
                if (container) {
                  window.scrollBy(0, -container.clientHeight);
                }
                const getters = {
                  editExercise: lbe.get(),
                };
                props.dispatch([
                  lbu<IProgramEditorState, typeof getters>(getters)
                    .p("current")
                    .p("program")
                    .p("exercises")
                    .recordModify((exercises, { editExercise }) => {
                      if (editExercise) {
                        return CollectionUtils.setBy(exercises, "id", programExercise.id, editExercise);
                      } else {
                        return exercises;
                      }
                    }),
                  lb<IProgramEditorState>()
                    .p("current")
                    .p("editExercises")
                    .p(EditExerciseUtil.getKey(programExercise.id, props.dayIndex))
                    .record(undefined),
                ]);
              }, 50);
            }
          }}
          kind="orange"
          disabled={isSaveDisabled}
          className={isSaveDisabled ? "opacity-50 cursor-default" : ""}
        >
          Save
        </Button>
      </div>
    </section>
  );
}

interface IReuseLogicProps {
  programExercise: IProgramExercise;
  dispatch: ILensDispatch<IProgramEditorState>;
  lbe: LensBuilder<IProgramEditorState, IProgramExercise, {}>;
  allProgramExercises: IProgramExercise[];
}

function ReuseLogic(props: IReuseLogicProps): JSX.Element {
  const reusingExercises = props.allProgramExercises.filter(
    (pe) => pe.reuseLogic?.selected === props.programExercise.id
  );
  if (reusingExercises.length > 0) {
    return (
      <span className="text-xs text-grayv2-main">
        This exercise is being reused by the following exercises: {reusingExercises.map((e) => e.name).join(", ")}
      </span>
    );
  }
  useEffect(() => {
    const selected = props.programExercise.reuseLogic?.selected;
    if (selected) {
      props.dispatch(EditProgramLenses.reuseLogic(props.lbe, props.allProgramExercises, selected), "ensureReuseLogic");
    }
  }, []);

  return (
    <section className="mt-2">
      <label>
        <span className="mr-2">Reuse logic from:</span>
        <MenuItemValue
          name="Reuse Logic"
          setPatternError={() => undefined}
          type="desktop-select"
          value={props.programExercise.reuseLogic?.selected || ""}
          values={[
            ["", "None"],
            ...props.allProgramExercises
              .filter((pe) => pe.id !== props.programExercise.id && pe.reuseLogic?.selected == null)
              .map<[string, string]>((e) => [e.id, e.name]),
          ]}
          onChange={(newValue) => {
            if (newValue != null) {
              props.dispatch(EditProgramLenses.reuseLogic(props.lbe, props.allProgramExercises, newValue));
            }
          }}
        />
      </label>
    </section>
  );
}
