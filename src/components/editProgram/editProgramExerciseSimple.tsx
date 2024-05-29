import { Program } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { h, JSX } from "preact";
import { ModalExercise } from "../modalExercise";
import { useState } from "preact/hooks";
import { EditProgram } from "../../models/editProgram";
import { Exercise, equipmentName } from "../../models/exercise";
import { MenuItem, MenuItemWrapper } from "../menuItem";
import { Button } from "../button";
import { ExerciseImage } from "../exerciseImage";
import { ISettings, IProgramExercise, IProgram } from "../../types";
import { ProgramExercise } from "../../models/programExercise";
import { EditCustomExercise } from "../../models/editCustomExercise";
import { EditProgramExerciseSimpleRow } from "./editProgramExerciseSimpleRow";
import { EditProgramExerciseSimpleErrors } from "./editProgramExerciseSimpleErrors";
import { EditProgramExerciseSimpleProgression } from "./editProgramExerciseSimpleProgression";
import { EditProgramExerciseSimpleDescription } from "./editProgramExerciseDescription";

interface IProps {
  settings: ISettings;
  program: IProgram;
  programIndex: number;
  programExercise: IProgramExercise;
  dispatch: IDispatch;
}

export function EditProgramExerciseSimple(props: IProps): JSX.Element {
  const { programExercise } = props;
  const isEligible = Program.isEligibleForSimpleExercise(programExercise);
  if (isEligible.success) {
    return <Edit {...props} />;
  } else {
    return <EditProgramExerciseSimpleErrors errors={isEligible.error} />;
  }
}

function Edit(props: IProps): JSX.Element {
  const { exercises: allProgramExercises } = props.program;
  const { programExercise } = props;

  const [showModalExercise, setShowModalExercise] = useState<boolean>(false);
  const [trigger, setTrigger] = useState<boolean>(false);

  return (
    <div className="px-4">
      <MenuItem
        name="Exercise"
        onClick={() => setShowModalExercise(true)}
        value={
          <div>
            <div>{Exercise.get(programExercise.exerciseType, props.settings.exercises).name}</div>
            <div className="text-xs text-grayv2-main">
              {equipmentName(programExercise.exerciseType.equipment, props.settings.equipment)}
            </div>
          </div>
        }
      />
      <div className="mt-2">
        <EditProgramExerciseSimpleDescription
          programExercise={props.programExercise}
          onChange={(value, index) => EditProgram.setDescription(props.dispatch, value, index)}
        />
      </div>
      <MenuItemWrapper name="exercise-image">
        <div className="mx-8">
          <ExerciseImage
            key={`${programExercise.exerciseType.id}_${programExercise.exerciseType.equipment}`}
            settings={props.settings}
            exerciseType={programExercise.exerciseType}
            size="large"
          />
        </div>
      </MenuItemWrapper>
      <MenuItemWrapper name="sets-reps-weight">
        <EditProgramExerciseSimpleRow
          programExercise={programExercise}
          allProgramExercises={allProgramExercises}
          settings={props.settings}
          onChange={(sets, reps, weight) => {
            EditProgram.updateSimpleExercise(props.dispatch, props.settings.units, sets, reps, weight);
            setTrigger(!trigger);
          }}
        />
      </MenuItemWrapper>
      <EditProgramExerciseSimpleProgression
        settings={props.settings}
        onUpdate={(progression, deload) => {
          EditProgram.setProgression(props.dispatch, progression, deload);
        }}
        finishDayExpr={ProgramExercise.getFinishDayScript(programExercise, allProgramExercises)}
      />
      <div className="p-2 mb-6 text-center">
        <Button
          name="save-exercise-simple"
          data-cy="save-exercise"
          kind="orange"
          onClick={() => {
            setTimeout(() => {
              EditProgram.saveExercise(props.dispatch, props.programIndex);
            }, 50);
          }}
        >
          Save
        </Button>
      </div>
      <ModalExercise
        isHidden={!showModalExercise}
        settings={props.settings}
        exerciseType={programExercise.exerciseType}
        onCreateOrUpdate={(shouldClose, name, targetMuscles, synergistMuscles, types, exercise) => {
          EditCustomExercise.createOrUpdate(props.dispatch, name, targetMuscles, synergistMuscles, types, exercise);
        }}
        onDelete={(id) => EditCustomExercise.markDeleted(props.dispatch, id)}
        onChange={(exerciseType, shouldClose) => {
          if (shouldClose) {
            setShowModalExercise(false);
          }
          if (exerciseType != null) {
            const oldExerciseType = programExercise.exerciseType;
            EditProgram.changeExercise(props.dispatch, props.settings, oldExerciseType, exerciseType);
          }
        }}
      />
    </div>
  );
}
