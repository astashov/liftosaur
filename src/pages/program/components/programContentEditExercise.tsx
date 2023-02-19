/* eslint-disable @typescript-eslint/ban-types */
import { lb, lbu, LensBuilder } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Button } from "../../../components/button";
import { ModalAddStateVariable } from "../../../components/editProgram/modalAddStateVariable";
import { ExerciseImage } from "../../../components/exerciseImage";
import { ModalExercise } from "../../../components/modalExercise";
import { ModalSubstitute } from "../../../components/modalSubstitute";
import { equipmentName, Exercise } from "../../../models/exercise";
import { Program } from "../../../models/program";
import { ProgramExercise } from "../../../models/programExercise";
import { IEquipment, IHistoryRecord, IProgram, IProgramExercise, ISettings, IUnit } from "../../../types";
import { CollectionUtils } from "../../../utils/collection";
import { IEither } from "../../../utils/types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { BuilderInlineInput } from "../../builder/components/builderInlineInput";
import { LinkButton } from "../../../components/linkButton";
import { EditProgramStateVariables } from "../../../components/editProgram/editProgramStateVariables";
import { ProgramContentPlayground } from "./programContentPlayground";
import { EditProgramLenses } from "../../../models/editProgramLenses";
import { MenuItemValue } from "../../../components/menuItemEditable";
import { EditProgramSets } from "../../../components/editProgram/editProgramSets";
import { EditProgramVariationsEnable } from "../../../components/editProgram/editProgramVariationsEnable";
import { EditProgramVariationsEditor } from "../../../components/editProgram/editProgramVariationsEditor";
import { EditProgramWarmupSets } from "../../../components/editProgram/editProgramWarmupSets";
import { EditProgramFinishDayScriptEditor } from "../../../components/editProgram/editProgramFinishDayScriptEditor";
import { EditCustomExerciseLenses } from "../../../models/editCustomExerciseLenses";
import { IconCloseCircleOutline } from "../../../components/icons/iconCloseCircleOutline";

interface IProps {
  settings: ISettings;
  program: IProgram;
  programExercise: IProgramExercise;
  isChanged: boolean;
  dispatch: ILensDispatch<IProgramEditorState>;
}

export function ProgramContentEditExercise(props: IProps): JSX.Element {
  const { programExercise } = props;
  const allProgramExercises = props.program.exercises;

  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  const prevProps = useRef<IProps>(props);
  const [progress, setProgress] = useState<IHistoryRecord | undefined>(() =>
    ProgramExercise.buildProgress(programExercise, allProgramExercises, 1, props.settings)
  );

  const [showModalExercise, setShowModalExercise] = useState<boolean>(false);
  const [showModalSubstitute, setShowModalSubstitute] = useState<boolean>(false);

  useEffect(() => {
    if (props.programExercise !== prevProps.current.programExercise) {
      setProgress(
        ProgramExercise.buildProgress(programExercise, allProgramExercises, progress?.day || 1, props.settings)
      );
    }
    prevProps.current = props;
  });
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
  const exercise = Exercise.get(programExercise.exerciseType, props.settings.exercises);

  const equipmentOptions: [IEquipment, string][] = Exercise.sortedEquipments(
    programExercise.exerciseType.id
  ).map((e) => [e, equipmentName(e)]);
  const lbe = lb<IProgramEditorState>().p("current").p("editExercises").pi(programExercise.id);
  const areVariationsEnabled = programExercise.variations.length > 1;
  const isSaveDisabled = !entry || !finishEditorResult.success || !variationScriptResult.success;

  return (
    <div className="relative p-2 bg-white border rounded-lg border-purplev2-400">
      <div className="flex">
        <div>
          <ExerciseImage
            className="w-12 mr-3"
            exerciseType={programExercise.exerciseType}
            size="small"
            customExercises={props.settings.exercises}
          />
        </div>
        <div className="flex-1">
          <div>
            Name:{" "}
            <BuilderInlineInput
              value={programExercise.name}
              onInputString={(str) => {
                console.log(str);
                props.dispatch(lbe.p("name").record(str));
              }}
            />
          </div>
          <div>
            <div className="inline-block">
              Exercise: <LinkButton onClick={() => setShowModalExercise(true)}>{exercise.name}</LinkButton>
            </div>
            <div className="inline-block ml-2">
              <select
                className="border rounded border-grayv2-main"
                value={programExercise.exerciseType.equipment}
                onChange={(e) => {
                  if (e.target instanceof HTMLSelectElement) {
                    props.dispatch(EditProgramLenses.changeExerciseEquipment(lbe, e.target.value as IEquipment));
                  }
                }}
              >
                {equipmentOptions.map(([id, value]) => {
                  return (
                    <option value={id} selected={id === programExercise.exerciseType.equipment}>
                      {value}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <LinkButton onClick={() => setShowModalSubstitute(true)}>Substitute</LinkButton>
            </div>
          </div>
        </div>
      </div>

      <div className="flex" style={{ gap: "1rem" }}>
        <div className="flex-1">
          {progress && entry && (
            <ProgramContentPlayground
              day={day}
              programExercise={programExercise}
              allProgramExercises={allProgramExercises}
              progress={progress}
              settings={props.settings}
              days={props.program.days}
              lbe={lbe}
              dispatch={props.dispatch}
              onProgressChange={(p) => setProgress(p)}
            />
          )}
        </div>
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
      <div className="p-2 mb-4 text-center">
        <Button
          className="mr-2"
          onClick={() => {
            if (
              !props.isChanged ||
              confirm("Are you sure? If you cancel, all your changes in this exercise would be lost")
            ) {
              props.dispatch([
                lb<IProgramEditorState>().p("current").p("editExercises").p(programExercise.id).record(undefined),
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
              lb<IProgramEditorState>().p("current").p("editExercises").p(programExercise.id).record(undefined),
            ]);
          }}
          kind="orange"
          disabled={isSaveDisabled}
          className={isSaveDisabled ? "opacity-50 cursor-default" : ""}
        >
          Save
        </Button>
      </div>
      <button
        className="absolute p-2"
        style={{ top: "0.25rem", right: "0.25rem" }}
        onClick={() => {
          if (
            !props.isChanged ||
            confirm("Are you sure? If you cancel, all your changes in this exercise would be lost")
          ) {
            props.dispatch([
              lb<IProgramEditorState>().p("current").p("editExercises").p(programExercise.id).record(undefined),
            ]);
          }
        }}
      >
        <IconCloseCircleOutline />
      </button>
      <ModalAddStateVariable
        isHidden={!shouldShowAddStateVariable}
        onDone={(newName, newType) => {
          if (newName != null && newType != null) {
            props.dispatch(EditProgramLenses.addStateVariable(lbe, newName, newType as IUnit));
          }
          setShouldShowAddStateVariable(false);
        }}
      />
      {showModalSubstitute && (
        <ModalSubstitute
          exerciseType={programExercise.exerciseType}
          customExercises={props.settings.exercises}
          onChange={(exerciseId) => {
            setShowModalSubstitute(false);
            if (exerciseId != null) {
              props.dispatch(EditProgramLenses.changeExerciseId(lbe, props.settings, exerciseId));
            }
          }}
        />
      )}
      <ModalExercise
        isHidden={!showModalExercise}
        settings={props.settings}
        onCreateOrUpdate={(name, equipment, targetMuscles, synergistMuscles, ex) => {
          props.dispatch(
            EditCustomExerciseLenses.createOrUpdate(
              lb<IProgramEditorState>().p("settings"),
              name,
              equipment,
              targetMuscles,
              synergistMuscles,
              ex
            )
          );
        }}
        onDelete={(id) => {
          props.dispatch(EditCustomExerciseLenses.markDeleted(lb<IProgramEditorState>().p("settings"), id));
        }}
        onChange={(exerciseId) => {
          setShowModalExercise(false);
          if (exerciseId != null) {
            props.dispatch(EditProgramLenses.changeExerciseId(lbe, props.settings, exerciseId));
          }
        }}
      />
    </div>
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
    <section>
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
