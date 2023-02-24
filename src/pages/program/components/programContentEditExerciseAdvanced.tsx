/* eslint-disable @typescript-eslint/ban-types */
import { h, JSX, Fragment } from "preact";
import { EditProgramStateVariables } from "../../../components/editProgram/editProgramStateVariables";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { IProgramExercise, ISettings, IHistoryRecord, IProgram, IUnit } from "../../../types";
import { EditProgramLenses } from "../../../models/editProgramLenses";
import { LensBuilder, lbu, lb } from "lens-shmens";
import { ProgramContentPlayground } from "./programContentPlayground";
import { useEffect, useState } from "preact/hooks";
import { LinkButton } from "../../../components/linkButton";
import { EditProgramVariationsEnable } from "../../../components/editProgram/editProgramVariationsEnable";
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
  const entry = progress?.entries[0];
  const day = progress?.day ?? 1;

  const finishScriptResult =
    entry != null
      ? Program.runExerciseFinishDayScript(
          entry,
          day,
          props.settings,
          programExercise.state,
          programExercise.finishDayExpr,
          entry?.exercise?.equipment
        )
      : Program.parseExerciseFinishDayScript(day, props.settings, programExercise.state, programExercise.finishDayExpr);
  const finishEditorResult: IEither<number | undefined, string> = finishScriptResult.success
    ? { success: true, data: undefined }
    : finishScriptResult;

  const variationScriptResult = Program.runVariationScript(programExercise, allProgramExercises, day, props.settings);
  const isSaveDisabled = !entry || !finishEditorResult.success || !variationScriptResult.success;

  return (
    <>
      <div className="my-2 text-sm text-grayv2-main">
        Need inspiration? Check out{" "}
        <LinkButton
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
      <div className="flex" style={{ gap: "1rem" }}>
        <div className="flex-1">
          <EditProgramStateVariables
            onEditStateVariable={(stateKey, newValue) => {
              const reuseLogicId = programExercise.reuseLogic?.selected;
              if (reuseLogicId) {
                props.dispatch(EditProgramLenses.editReuseLogicStateVariable(lbe, reuseLogicId, stateKey, newValue));
              } else {
                props.dispatch(EditProgramLenses.editStateVariable(lbe, stateKey, newValue));
              }
            }}
            programExercise={programExercise}
            onAddStateVariable={() => {
              setShouldShowAddStateVariable(true);
            }}
          />
        </div>
        <div className="flex-1">
          {progress && entry && (
            <ProgramContentPlayground
              day={day}
              programExercise={programExercise}
              allProgramExercises={allProgramExercises}
              progress={progress}
              settings={props.settings}
              days={props.program.days}
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

      {!programExercise.reuseLogic?.selected && (
        <>
          {programExercise.variations.map((_, variationIndex) => {
            return (
              <EditProgramSets
                inOneLine={true}
                variationIndex={variationIndex}
                settings={props.settings}
                day={day}
                programExercise={programExercise}
                onChangeReps={(reps: string, variation: number, setIndex: number) => {
                  props.dispatch(EditProgramLenses.setReps(lbe, reps, variation, setIndex));
                }}
                onChangeAmrap={(isSet: boolean, variation: number, setIndex: number) => {
                  props.dispatch(EditProgramLenses.setAmrap(lbe, isSet, variation, setIndex));
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
              />
            );
          })}
          {areVariationsEnabled ? (
            <LinkButton className="my-4" onClick={() => props.dispatch(EditProgramLenses.addVariation(lbe))}>
              Add Variation
            </LinkButton>
          ) : (
            <EditProgramVariationsEnable
              onClick={() => {
                props.dispatch(EditProgramLenses.addVariation(lbe));
              }}
            />
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
          <section className="px-4 py-2 mt-4 bg-purple-100 rounded-2xl">
            <EditProgramWarmupSets
              programExercise={programExercise}
              settings={props.settings}
              onAddWarmupSet={(warmupSets) => {
                props.dispatch(EditProgramLenses.addWarmupSet(lbe, warmupSets));
              }}
              onRemoveWarmupSet={(warmupSets, index) => {
                props.dispatch(EditProgramLenses.removeWarmupSet(lbe, warmupSets, index));
              }}
              onUpdateWarmupSet={(warmupSets, index, newWarmupSet) => {
                props.dispatch(EditProgramLenses.updateWarmupSet(lbe, warmupSets, index, newWarmupSet));
              }}
              onSetDefaultWarmupSets={(ex) => {
                props.dispatch(EditProgramLenses.setDefaultWarmupSets(lbe, ex), "setDefaultWarmupSets");
              }}
            />
          </section>
          <EditProgramFinishDayScriptEditor
            programExercise={programExercise}
            editorResult={finishEditorResult}
            onSetFinishDayExpr={(expr) => {
              props.dispatch(EditProgramLenses.setExerciseFinishDayExpr(lbe, expr));
            }}
          />
        </>
      )}
      <ModalAddStateVariable
        isHidden={!shouldShowAddStateVariable}
        onDone={(newName, newType) => {
          if (newName != null && newType != null) {
            props.dispatch(EditProgramLenses.addStateVariable(lbe, newName, newType as IUnit));
          }
          setShouldShowAddStateVariable(false);
        }}
      />

      <div className="p-2 mb-4 text-center">
        <Button
          className="mr-2"
          onClick={() => {
            if (
              !props.isChanged ||
              confirm("Are you sure? If you cancel, all your changes in this exercise would be lost")
            ) {
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
          onClick={() => {
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
          }}
          kind="orange"
          disabled={isSaveDisabled}
          className={isSaveDisabled ? "opacity-50 cursor-default" : ""}
        >
          Save
        </Button>
      </div>
    </>
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
