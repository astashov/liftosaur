import { JSX } from "react";
import { IHistoryRecord, ISettings } from "../../types";
import { IDispatch } from "../../ducks/types";
import { ModalAmrap } from "../modalAmrap";
import { BottomSheetEditTarget } from "../bottomSheetEditTarget";
import { ProgramPreviewPlaygroundExerciseEditModal } from "./programPreviewPlaygroundExerciseEditModal";
import { lb } from "lens-shmens";
import { EditProgramLenses_properlyUpdateStateVariable } from "../../models/editProgramLenses";
import {
  IEvaluatedProgram,
  Program_getProgramExercise,
  Program_getDayData,
  Program_stateValue,
} from "../../models/program";
import { Exercise_toKey } from "../../models/exercise";
import { Weight_build } from "../../models/weight";
import { PlannerProgramExercise_getState } from "../../pages/planner/models/plannerProgramExercise";

interface IWebWorkoutModalsProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  settings: ISettings;
  program: IEvaluatedProgram;
  day: number;
  onProgramChange: (newProgram: IEvaluatedProgram) => void;
  onSettingsChange: (newSettings: ISettings) => void;
}

export function WebWorkoutModals(props: IWebWorkoutModalsProps): JSX.Element {
  const editModalProgramExerciseId = props.progress.ui?.editModal?.programExerciseId;
  const editModalProgramExercise = editModalProgramExerciseId
    ? Program_getProgramExercise(props.day, props.program, editModalProgramExerciseId)
    : undefined;

  return (
    <>
      {props.progress.ui?.amrapModal && (
        <ModalAmrap
          isPlayground={true}
          progress={props.progress}
          dispatch={props.dispatch}
          settings={props.settings}
          programExercise={Program_getProgramExercise(
            props.day,
            props.program,
            props.progress.entries[props.progress.ui?.amrapModal?.entryIndex || 0]?.programExerciseId
          )}
          otherStates={props.program.states}
        />
      )}
      <BottomSheetEditTarget
        settings={props.settings}
        progress={props.progress}
        dispatch={props.dispatch}
        editSetModal={props.progress.ui?.editSetModal}
        isHidden={props.progress.ui?.editSetModal == null}
        onClose={() => {
          props.dispatch({
            type: "UpdateProgress",
            lensRecordings: [lb<IHistoryRecord>().pi("ui").p("editSetModal").record(undefined)],
            desc: "close-bottomsheet-target",
          });
        }}
      />
      {editModalProgramExercise && (
        <ProgramPreviewPlaygroundExerciseEditModal
          onClose={() =>
            props.dispatch({
              type: "UpdateProgress",
              lensRecordings: [lb<IHistoryRecord>().pi("ui").p("editModal").record(undefined)],
              desc: "close-playground-exercise-edit-modal",
            })
          }
          onEditStateVariable={(stateKey, newValue) => {
            const dayData = Program_getDayData(props.program, props.day);
            const lensRecording = EditProgramLenses_properlyUpdateStateVariable(
              lb<IEvaluatedProgram>()
                .p("weeks")
                .i(dayData.week - 1)
                .p("days")
                .i(dayData.dayInWeek - 1)
                .p("exercises")
                .find((e) => e.key === editModalProgramExerciseId),
              {
                [stateKey]: Program_stateValue(
                  PlannerProgramExercise_getState(editModalProgramExercise),
                  stateKey,
                  newValue
                ),
              }
            );
            const newProgram = lensRecording.reduce((acc, lens) => lens.fn(acc), props.program);
            props.onProgramChange(newProgram);
          }}
          onEditVariable={(variableKey, newValue) => {
            if (!editModalProgramExercise.exerciseType) {
              return;
            }
            const exerciseType = Exercise_toKey(editModalProgramExercise.exerciseType);
            const newSettings = {
              ...props.settings,
              exerciseData: {
                ...props.settings.exerciseData,
                [exerciseType]: {
                  ...props.settings.exerciseData[exerciseType],
                  [variableKey]: Weight_build(newValue, props.settings.units),
                },
              },
            };
            props.onSettingsChange(newSettings);
          }}
          programExercise={editModalProgramExercise}
          settings={props.settings}
        />
      )}
    </>
  );
}
