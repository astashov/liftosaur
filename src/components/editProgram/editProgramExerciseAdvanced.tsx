import { h, JSX, Fragment } from "preact";
import { Program } from "../../models/program";
import { GroupHeader } from "../groupHeader";
import { IDispatch } from "../../ducks/types";
import { MenuItemEditable } from "../menuItemEditable";
import { Button } from "../button";
import { EditProgram } from "../../models/editProgram";
import { useState, useRef, useEffect } from "preact/hooks";
import { ModalAddStateVariable } from "./modalAddStateVariable";
import { IEither } from "../../utils/types";
import { MenuItem } from "../menuItem";
import { ModalExercise } from "../modalExercise";
import { Exercise, equipmentName } from "../../models/exercise";
import { ExerciseImage } from "../exerciseImage";
import { ModalSubstitute } from "../modalSubstitute";
import {
  ISettings,
  IProgramExercise,
  IHistoryRecord,
  IEquipment,
  IUnit,
  ISubscription,
  IProgram,
  IPercentageUnit,
} from "../../types";
import { Playground } from "../playground";
import { LinkButton } from "../linkButton";
import { ProgramExercise } from "../../models/programExercise";
import { EditProgramSets } from "./editProgramSets";
import { EditProgramWarmupSets } from "./editProgramWarmupSets";
import { EditProgramFinishDayScriptEditor } from "./editProgramFinishDayScriptEditor";
import { EditProgramStateVariables } from "./editProgramStateVariables";
import { EditCustomExercise } from "../../models/editCustomExercise";
import { EditProgramVariationsEditor } from "./editProgramVariationsEditor";
import { ModalEditProgramExerciseExamples } from "./modalEditProgramExerciseExamples";
import { EditProgramExtraFeatures } from "./editProgramExtraFeatures";
import { EditProgramExerciseAdvancedDescriptions } from "./editProgramExerciseDescription";
import { Progress } from "../../models/progress";

interface IProps {
  settings: ISettings;
  programIndex: number;
  programExercise: IProgramExercise;
  subscription: ISubscription;
  program: IProgram;
  dispatch: IDispatch;
}

export function EditProgramExerciseAdvanced(props: IProps): JSX.Element {
  const { programExercise } = props;
  const { exercises: allProgramExercises } = props.program;

  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  const prevProps = useRef<IProps>(props);
  const [variationIndex, setVariationIndex] = useState<number>(0);
  const [progress, setProgress] = useState<IHistoryRecord | undefined>(() =>
    ProgramExercise.buildProgress(programExercise, allProgramExercises, { day: 1 }, props.settings)
  );

  const [showModalExercise, setShowModalExercise] = useState<boolean>(false);
  const [showModalSubstitute, setShowModalSubstitute] = useState<boolean>(false);
  const [showVariations, setShowVariations] = useState<boolean>(programExercise.variations.length > 1);
  const [showModalExamples, setShowModalExamples] = useState<boolean>(false);
  const [isTimerValid, setIsTimerValid] = useState<boolean>(true);

  const variationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (props.programExercise !== prevProps.current.programExercise) {
      setProgress(
        ProgramExercise.buildProgress(
          programExercise,
          allProgramExercises,
          progress ? Progress.getDayData(progress) : { day: 1 },
          props.settings
        )
      );
    }
    window.isUndoing = false;
    prevProps.current = props;
  });
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
          props.program.exercises,
          props.program.planner ? "planner" : "regular"
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

  const equipmentOptions: [IEquipment, string][] = Exercise.sortedEquipments(
    programExercise.exerciseType.id,
    props.settings
  ).map((e) => [e, equipmentName(e, props.settings.equipment)]);

  const cannotSave = !entry || !finishEditorResult.success || !variationScriptResult.success || !isTimerValid;
  const isReusingDescription = ProgramExercise.isDescriptionReused(programExercise);

  return (
    <div className="px-4">
      <div className="my-2 text-sm text-grayv2-main">
        Need inspiration? Check out{" "}
        <LinkButton
          name="edit-exercise-advanced-examples"
          className="cursor-pointer"
          onClick={() => setShowModalExamples(true)}
        >
          examples
        </LinkButton>{" "}
        of different exercise logic
      </div>
      <MenuItemEditable
        type="text"
        name="Name"
        value={programExercise.name}
        onChange={(newName) => {
          EditProgram.changeExerciseName(props.dispatch, newName);
        }}
      />
      <MenuItem
        name="Exercise"
        onClick={() => setShowModalExercise(true)}
        value={Exercise.get(programExercise.exerciseType, props.settings.exercises).name}
      />
      <LinkButton
        name="edit-exercise-advanced-substitute"
        className="mb-4"
        onClick={() => setShowModalSubstitute(true)}
      >
        Substitute Exercise
      </LinkButton>
      <MenuItemEditable
        type="select"
        name="Equipment"
        value={programExercise.exerciseType.equipment || "bodyweight"}
        values={equipmentOptions}
        onChange={(newEquipment) => {
          EditProgram.changeExerciseEquipment(props.dispatch, newEquipment ? (newEquipment as IEquipment) : undefined);
        }}
      />
      <div className="mt-2">
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
          onAdd={() => EditProgram.addDescription(props.dispatch)}
          onRemove={(index) => EditProgram.removeDescription(props.dispatch, index)}
          onChange={(value, index) => EditProgram.changeDescription(props.dispatch, value, index)}
          onChangeExpr={(value) => EditProgram.changeDescriptionExpr(props.dispatch, value)}
          onReorder={(startIndex, endIndex) => EditProgram.reorderDescriptions(props.dispatch, startIndex, endIndex)}
        />
      </div>
      <ExerciseImage
        settings={props.settings}
        key={`${programExercise.exerciseType.id}_${programExercise.exerciseType.equipment}`}
        exerciseType={programExercise.exerciseType}
        size="large"
      />
      <ReuseLogic
        dispatch={props.dispatch}
        programExercise={programExercise}
        allProgramExercises={allProgramExercises}
      />
      <div className="mt-8">
        <EditProgramStateVariables
          stateMetadata={stateMetadata}
          settings={props.settings}
          programExercise={programExercise}
          onEditStateVariable={(stateKey, newValue) => {
            EditProgram.properlyUpdateStateVariable(props.dispatch, programExercise, stateKey, newValue);
          }}
          onAddStateVariable={() => {
            setShouldShowAddStateVariable(true);
          }}
          onChangeStateVariableUnit={() => {
            EditProgram.switchStateVariablesToUnit(props.dispatch, props.settings);
          }}
        />
      </div>
      {!programExercise.reuseLogic?.selected ? (
        <div>
          <div ref={variationsRef} className={`${!showVariations ? "invisible h-0" : ""}`}>
            <Variations
              variationIndex={variationIndex}
              programExercise={programExercise}
              dispatch={props.dispatch}
              onChangeVariation={(i) => setVariationIndex(i)}
            />
            {programExercise.variations.length > 1 && (
              <EditProgramVariationsEditor
                programExercise={programExercise}
                editorResult={variationScriptResult}
                onChange={(value) => {
                  EditProgram.setExerciseVariationExpr(props.dispatch, value);
                }}
              />
            )}
          </div>
          <EditProgramSets
            variationIndex={variationIndex}
            settings={props.settings}
            dayData={dayData}
            programExercise={programExercise}
            onChangeLabel={(variation: number, setIndex: number, label: string) => {
              EditProgram.setLabel(props.dispatch, label, variation, setIndex);
            }}
            onChangeMinReps={(reps: string, variation: number, setIndex: number) => {
              EditProgram.setMinReps(props.dispatch, reps, variation, setIndex);
            }}
            onChangeReps={(reps: string, variation: number, setIndex: number) => {
              EditProgram.setReps(props.dispatch, reps, variation, setIndex);
            }}
            onChangeRpe={(rpe: string, variation: number, setIndex: number) => {
              EditProgram.setRpe(props.dispatch, rpe, variation, setIndex);
            }}
            onChangeAmrap={(isSet: boolean, variation: number, setIndex: number) => {
              EditProgram.setAmrap(props.dispatch, isSet, variation, setIndex);
            }}
            onChangeLogRpe={(isSet: boolean, variation: number, setIndex: number) => {
              EditProgram.setLogRpe(props.dispatch, isSet, variation, setIndex);
            }}
            onChangeWeight={(weight: string, variation: number, setIndex: number) => {
              EditProgram.setWeight(props.dispatch, weight, variation, setIndex);
            }}
            onRemoveSet={(variation: number, setIndex: number) => {
              EditProgram.removeSet(props.dispatch, variation, setIndex);
            }}
            onReorderSets={(variation: number, startIndex: number, endIndex: number) => {
              EditProgram.reorderSets(props.dispatch, variation, startIndex, endIndex);
            }}
            onAddSet={(variation: number) => {
              EditProgram.addSet(props.dispatch, variation);
            }}
          />
          <div className="pt-8">
            <EditProgramWarmupSets
              programExercise={programExercise}
              settings={props.settings}
              onAddWarmupSet={(warmupSets) => {
                EditProgram.addWarmupSet(props.dispatch, warmupSets, props.settings.units);
              }}
              onRemoveWarmupSet={(warmupSets, index) => {
                EditProgram.removeWarmupSet(props.dispatch, warmupSets, index);
              }}
              onUpdateWarmupSet={(warmupSets, index, newWarmupSet) => {
                EditProgram.updateWarmupSet(props.dispatch, warmupSets, index, newWarmupSet);
              }}
              onSetDefaultWarmupSets={(exercise) => {
                EditProgram.setDefaultWarmupSets(props.dispatch, exercise, props.settings.units);
              }}
            />
          </div>
          <EditProgramExtraFeatures
            dayData={dayData}
            settings={props.settings}
            programExercise={programExercise}
            entry={entry}
            onChangeQuickAddSets={(quickAddSets) => {
              EditProgram.setQuickAddSets(props.dispatch, quickAddSets);
            }}
            onChangeEnableRpe={(enableRpe) => {
              EditProgram.setEnableRpe(props.dispatch, enableRpe);
            }}
            onChangeEnableRepRanges={(enableRepRanges) => {
              EditProgram.setEnableRepRanges(props.dispatch, enableRepRanges);
            }}
            onValid={(isValid) => {
              setIsTimerValid(isValid);
            }}
            areVariationsEnabled={showVariations}
            onEnableVariations={() => {
              setShowVariations(true);
              variationsRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            onChangeTimer={(expr) => {
              EditProgram.setTimer(props.dispatch, expr);
            }}
          />
          <EditProgramFinishDayScriptEditor
            programExercise={programExercise}
            editorResult={finishEditorResult}
            onSetFinishDayExpr={(expr) => {
              EditProgram.setExerciseFinishDayExpr(props.dispatch, expr);
            }}
          />
          {progress && entry && (
            <Playground
              dayData={dayData}
              program={props.program}
              subscription={props.subscription}
              programExercise={programExercise}
              progress={progress}
              settings={props.settings}
              onProgressChange={(p) => setProgress(p)}
            />
          )}
        </div>
      ) : (
        <>
          <div className="p-8 text-2xl font-bold text-center text-gray-600">
            {ProgramExercise.getProgramExercise(programExercise, allProgramExercises).name} exercise logic is used
          </div>
          <div>
            <EditProgramWarmupSets
              programExercise={programExercise}
              settings={props.settings}
              onAddWarmupSet={(warmupSets) => {
                EditProgram.addWarmupSet(props.dispatch, warmupSets, props.settings.units);
              }}
              onRemoveWarmupSet={(warmupSets, index) => {
                EditProgram.removeWarmupSet(props.dispatch, warmupSets, index);
              }}
              onUpdateWarmupSet={(warmupSets, index, newWarmupSet) => {
                EditProgram.updateWarmupSet(props.dispatch, warmupSets, index, newWarmupSet);
              }}
              onSetDefaultWarmupSets={(exercise) => {
                EditProgram.setDefaultWarmupSets(props.dispatch, exercise, props.settings.units);
              }}
            />
          </div>
        </>
      )}
      <div className="p-2 mb-8 text-center">
        <Button
          name="save-exercise-advanced"
          kind="orange"
          data-cy="save-program"
          disabled={cannotSave}
          onClick={() => {
            if (!cannotSave) {
              setTimeout(() => {
                EditProgram.saveExercise(props.dispatch, props.programIndex);
              }, 50);
            }
          }}
        >
          Save
        </Button>
      </div>
      <ModalAddStateVariable
        isHidden={!shouldShowAddStateVariable}
        onDone={(newName, newType, newUserPrompted) => {
          EditProgram.addStateVariable(
            props.dispatch,
            newName,
            newType as IUnit | IPercentageUnit | undefined,
            newUserPrompted
          );
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
              EditProgram.changeExerciseId(props.dispatch, props.settings, programExercise.exerciseType, exerciseId);
            }
          }}
        />
      )}
      <ModalExercise
        isHidden={!showModalExercise}
        settings={props.settings}
        onCreateOrUpdate={(name, equipment, targetMuscles, synergistMuscles, types, exercise) => {
          EditCustomExercise.createOrUpdate(
            props.dispatch,
            name,
            equipment,
            targetMuscles,
            synergistMuscles,
            types,
            exercise
          );
        }}
        onDelete={(id) => EditCustomExercise.markDeleted(props.dispatch, id)}
        onChange={(exerciseId) => {
          setShowModalExercise(false);
          if (exerciseId != null) {
            EditProgram.changeExerciseId(props.dispatch, props.settings, programExercise.exerciseType, exerciseId);
          }
        }}
      />
      {showModalExamples && (
        <ModalEditProgramExerciseExamples
          unit={props.settings.units}
          dispatch={props.dispatch}
          onClose={() => setShowModalExamples(false)}
        />
      )}
    </div>
  );
}

interface IVariationsProps {
  programExercise: IProgramExercise;
  variationIndex: number;
  dispatch: IDispatch;
  onChangeVariation: (newIndex: number) => void;
}

function Variations(props: IVariationsProps): JSX.Element {
  const { programExercise, variationIndex, dispatch } = props;

  return (
    <Fragment>
      <GroupHeader
        topPadding={true}
        name="Sets Variations"
        help={
          <span>
            Sets variations allow you to use different <strong>sets x reps x weight</strong> schemes in exercises. It's
            useful in some programs, e.g. in GZCLP program you follow 5x3, and if you fail it, you switch to 6x2 scheme.
            If you don't need anything like that, please ignore it.
          </span>
        }
      />
      <MenuItemEditable
        type="select"
        name="Selected Variation"
        value={variationIndex.toString()}
        values={programExercise.variations.map((_, i) => [i.toString(), `Variation ${i + 1}`])}
        onChange={(newIndex) => {
          props.onChangeVariation(parseInt(newIndex!, 10));
        }}
      />
      <div className="flex justify-between">
        <LinkButton
          name="add-variation"
          onClick={() => {
            EditProgram.addVariation(dispatch);
            props.onChangeVariation(props.variationIndex + 1);
          }}
        >
          Add New Variation
        </LinkButton>
        {programExercise.variations.length > 1 && (
          <LinkButton
            name="delete-variation"
            onClick={() => {
              EditProgram.removeVariation(dispatch, props.variationIndex);
              props.onChangeVariation(Math.max(variationIndex - 1, 0));
            }}
          >
            Delete Current Variation
          </LinkButton>
        )}
      </div>
      <div className="p-1"></div>
    </Fragment>
  );
}

interface IReuseLogicProps {
  programExercise: IProgramExercise;
  dispatch: IDispatch;
  allProgramExercises: IProgramExercise[];
}

function ReuseLogic(props: IReuseLogicProps): JSX.Element {
  useEffect(() => {
    const selected = props.programExercise.reuseLogic?.selected;
    if (selected) {
      EditProgram.reuseLogic(props.dispatch, props.allProgramExercises, selected);
    }
  }, []);

  return (
    <section>
      <GroupHeader
        name="Reuse logic of other exercises"
        help={
          <span>
            To avoid repetition, if you have multiple exercises that have the same reps, sets and finish day script (but
            maybe different state variables), you may reuse the logic of another exercise. You'll specify your own state
            variables, but all the Liftoscript expressions and sets/reps will used from another exercise.
          </span>
        }
      />
      <MenuItemEditable
        name="Reuse logic of"
        type="select"
        value={props.programExercise.reuseLogic?.selected || ""}
        values={[
          ["", "None"],
          ...props.allProgramExercises
            .filter((pe) => pe.id !== props.programExercise.id && pe.reuseLogic?.selected == null)
            .map<[string, string]>((e) => [e.id, e.name]),
        ]}
        onChange={(newValue) => {
          if (newValue != null) {
            EditProgram.reuseLogic(props.dispatch, props.allProgramExercises, newValue);
          }
        }}
      />
    </section>
  );
}
