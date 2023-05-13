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
  IProgramDay,
  IProgramExercise,
  IHistoryRecord,
  IEquipment,
  IUnit,
  ISubscription,
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
import { Input } from "../input";

interface IProps {
  settings: ISettings;
  days: IProgramDay[];
  programIndex: number;
  programExercise: IProgramExercise;
  subscription: ISubscription;
  allProgramExercises: IProgramExercise[];
  programName: string;
  dispatch: IDispatch;
}

export function EditProgramExerciseAdvanced(props: IProps): JSX.Element {
  const { programExercise, allProgramExercises } = props;

  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  const prevProps = useRef<IProps>(props);
  const [variationIndex, setVariationIndex] = useState<number>(0);
  const [progress, setProgress] = useState<IHistoryRecord | undefined>(() =>
    ProgramExercise.buildProgress(programExercise, allProgramExercises, 1, props.settings)
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
        ProgramExercise.buildProgress(programExercise, allProgramExercises, progress?.day || 1, props.settings)
      );
    }
    window.isUndoing = false;
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
  const stateMetadata = ProgramExercise.getStateMetadata(programExercise, allProgramExercises);

  const equipmentOptions: [IEquipment, string][] = Exercise.sortedEquipments(
    programExercise.exerciseType.id
  ).map((e) => [e, equipmentName(e)]);

  const cannotSave = !entry || !finishEditorResult.success || !variationScriptResult.success || !isTimerValid;

  return (
    <div className="px-4">
      <div className="my-2 text-sm text-grayv2-main">
        Need inspiration? Check out{" "}
        <LinkButton className="cursor-pointer" onClick={() => setShowModalExamples(true)}>
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
      <LinkButton className="mb-4" onClick={() => setShowModalSubstitute(true)}>
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
        <Input
          label="Description"
          value={props.programExercise.description}
          multiline={4}
          data-cy="exercise-description"
          name="exercise-description"
          placeholder="Place the feet shoulder width apart..."
          maxLength={4095}
          onInput={(e) => {
            const target = e.target;
            if (target instanceof HTMLTextAreaElement) {
              EditProgram.setDescription(props.dispatch, target.value);
            }
          }}
        />
        <div className="text-xs italic leading-none text-right text-grayv2-main">
          <a className="underline text-bluev2" href="https://www.markdownguide.org/cheat-sheet" target="_blank">
            Markdown
          </a>{" "}
          supported
        </div>
      </div>
      <ExerciseImage
        key={`${programExercise.exerciseType.id}_${programExercise.exerciseType.equipment}`}
        exerciseType={programExercise.exerciseType}
        size="large"
      />
      <ReuseLogic
        dispatch={props.dispatch}
        programExercise={programExercise}
        allProgramExercises={props.allProgramExercises}
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
            day={day}
            programExercise={programExercise}
            onChangeReps={(reps: string, variation: number, setIndex: number) => {
              EditProgram.setReps(props.dispatch, reps, variation, setIndex);
            }}
            onChangeAmrap={(isSet: boolean, variation: number, setIndex: number) => {
              EditProgram.setAmrap(props.dispatch, isSet, variation, setIndex);
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
                EditProgram.addWarmupSet(props.dispatch, warmupSets);
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
            day={day}
            settings={props.settings}
            programExercise={programExercise}
            entry={entry}
            onChangeQuickAddSets={(quickAddSets) => {
              EditProgram.setQuickAddSets(props.dispatch, quickAddSets);
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
              day={day}
              subscription={props.subscription}
              programExercise={programExercise}
              allProgramExercises={allProgramExercises}
              progress={progress}
              settings={props.settings}
              days={props.days}
              onProgressChange={(p) => setProgress(p)}
            />
          )}
        </div>
      ) : (
        <div className="p-8 text-2xl font-bold text-center text-gray-600">
          {ProgramExercise.getProgramExercise(programExercise, allProgramExercises).name} exercise logic is used
        </div>
      )}
      <div className="p-2 mb-8 text-center">
        <Button
          kind="orange"
          data-cy="save-program"
          disabled={cannotSave}
          onClick={() => {
            if (!cannotSave) {
              EditProgram.saveExercise(props.dispatch, props.programIndex);
            }
          }}
        >
          Save
        </Button>
      </div>
      <ModalAddStateVariable
        isHidden={!shouldShowAddStateVariable}
        onDone={(newName, newType, newUserPrompted) => {
          EditProgram.addStateVariable(props.dispatch, newName, newType as IUnit | undefined, newUserPrompted);
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
              EditProgram.changeExerciseId(props.dispatch, props.settings, exerciseId);
            }
          }}
        />
      )}
      <ModalExercise
        isHidden={!showModalExercise}
        settings={props.settings}
        onCreateOrUpdate={(name, equipment, targetMuscles, synergistMuscles, exercise) => {
          EditCustomExercise.createOrUpdate(props.dispatch, name, equipment, targetMuscles, synergistMuscles, exercise);
        }}
        onDelete={(id) => EditCustomExercise.markDeleted(props.dispatch, id)}
        onChange={(exerciseId) => {
          setShowModalExercise(false);
          if (exerciseId != null) {
            EditProgram.changeExerciseId(props.dispatch, props.settings, exerciseId);
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
          onClick={() => {
            EditProgram.addVariation(dispatch);
            props.onChangeVariation(props.variationIndex + 1);
          }}
        >
          Add New Variation
        </LinkButton>
        {programExercise.variations.length > 1 && (
          <LinkButton
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
            .filter((pe) => pe.id !== props.programExercise.id)
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
