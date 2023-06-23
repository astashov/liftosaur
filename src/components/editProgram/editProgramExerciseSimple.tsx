import { Program } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { h, JSX } from "preact";
import { ModalExercise } from "../modalExercise";
import { useState } from "preact/hooks";
import { EditProgram } from "../../models/editProgram";
import { Exercise, equipmentName } from "../../models/exercise";
import { MenuItemEditable } from "../menuItemEditable";
import { MenuItem, MenuItemWrapper } from "../menuItem";
import { Button } from "../button";
import { ExerciseImage } from "../exerciseImage";
import { ModalSubstitute } from "../modalSubstitute";
import { ISettings, IProgramDay, IProgramExercise, IEquipment } from "../../types";
import { LinkButton } from "../linkButton";
import { ProgramExercise } from "../../models/programExercise";
import { EditCustomExercise } from "../../models/editCustomExercise";
import { EditProgramExerciseSimpleRow } from "./editProgramExerciseSimpleRow";
import { EditProgramExerciseSimpleErrors } from "./editProgramExerciseSimpleErrors";
import { EditProgramExerciseSimpleProgression } from "./editProgramExerciseSimpleProgression";
import { EditProgramExerciseSimpleDescription } from "./editProgramExerciseDescription";

interface IProps {
  settings: ISettings;
  days: IProgramDay[];
  programIndex: number;
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  programName: string;
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
  const { programExercise, allProgramExercises } = props;

  const [showModalExercise, setShowModalExercise] = useState<boolean>(false);
  const [showModalSubstitute, setShowModalSubstitute] = useState<boolean>(false);

  const equipmentOptions: [IEquipment, string][] = Exercise.sortedEquipments(
    programExercise.exerciseType.id
  ).map((e) => [e, equipmentName(e)]);

  const [trigger, setTrigger] = useState<boolean>(false);

  return (
    <div className="px-4">
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
        <EditProgramExerciseSimpleDescription
          programExercise={props.programExercise}
          onChange={(value, index) => EditProgram.setDescription(props.dispatch, value, index)}
        />
      </div>
      <MenuItemWrapper name="exercise-image">
        <div className="mx-8">
          <ExerciseImage
            key={`${programExercise.exerciseType.id}_${programExercise.exerciseType.equipment}`}
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
    </div>
  );
}
