import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Button } from "../button";
import { MenuItemEditable } from "../menuItemEditable";
import { Modal } from "../modal";
import { Weight_is, Weight_isPct } from "../../models/weight";
import { IProgramStateMetadata, ISettings, IExerciseDataValue, IProgramState } from "../../types";
import { ObjectUtils_keys } from "../../utils/object";
import { ExerciseRM } from "../exerciseRm";
import { Exercise_get } from "../../models/exercise";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import {
  PlannerProgramExercise_getState,
  PlannerProgramExercise_getStateMetadata,
} from "../../pages/planner/models/plannerProgramExercise";

interface IProgramPreviewPlaygroundExerciseEditModalProps {
  programExercise: IPlannerProgramExercise;
  hideVariables?: boolean;
  onClose: () => void;
  onEditStateVariable: (stateKey: string, newValue: string) => void;
  onEditVariable: (variableKey: keyof IExerciseDataValue, newValue: number) => void;
  settings: ISettings;
}

export function ProgramPreviewPlaygroundExerciseEditContent(
  props: IProgramPreviewPlaygroundExerciseEditModalProps
): JSX.Element | null {
  const programExercise = props.programExercise;
  const state = PlannerProgramExercise_getState(props.programExercise);
  const stateMetadata = PlannerProgramExercise_getStateMetadata(props.programExercise);
  const hasStateVariables = ObjectUtils_keys(state).length > 0;
  const pendingStateVarsRef = useRef<Record<string, string>>({});
  const [pendingRm, setPendingRm] = useState<string | undefined>(undefined);
  if (!programExercise.exerciseType) {
    return null;
  }
  const exercise = Exercise_get(programExercise.exerciseType, props.settings.exercises);
  return (
    <View style={{ minWidth: 240 }}>
      {!props.hideVariables && (
        <ExerciseRM
          name="1 Rep Max"
          rmKey="rm1"
          exercise={exercise}
          settings={props.settings}
          displayValue={pendingRm}
          onEditVariable={(v) => {
            setPendingRm(String(v));
          }}
          onInput={(v) => {
            setPendingRm(v);
          }}
        />
      )}
      {(hasStateVariables || props.hideVariables) && (
        <>
          <Text className="mb-2 text-lg font-bold text-center">Edit state variables</Text>
          {hasStateVariables ? (
            <ProgramStateVariables
              settings={props.settings}
              state={state}
              stateMetadata={stateMetadata}
              onEditStateVariable={props.onEditStateVariable}
              pendingRef={pendingStateVarsRef}
            />
          ) : (
            <View className="px-4 py-2">
              <Text className="text-sm italic text-center text-text-secondary">No state variables</Text>
            </View>
          )}
        </>
      )}
      <View className="items-center mt-4">
        <Button
          name="details-workout-playground-save-statvars"
          kind="purple"
          onClick={() => {
            if (pendingRm != null) {
              const num = parseFloat(pendingRm);
              if (!isNaN(num)) {
                props.onEditVariable("rm1", num);
              }
            }
            for (const [key, value] of Object.entries(pendingStateVarsRef.current)) {
              props.onEditStateVariable(key, value);
            }
            props.onClose();
          }}
          data-testid="modal-edit-mode-save-statvars"
          testID="modal-edit-mode-save-statvars"
        >
          Done
        </Button>
      </View>
    </View>
  );
}

export function ProgramPreviewPlaygroundExerciseEditModal(
  props: IProgramPreviewPlaygroundExerciseEditModalProps
): JSX.Element | null {
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <ProgramPreviewPlaygroundExerciseEditContent {...props} />
    </Modal>
  );
}

interface IStateProps {
  state: IProgramState;
  stateMetadata?: IProgramStateMetadata;
  onEditStateVariable: (stateKey: string, newValue: string) => void;
  settings: ISettings;
  pendingRef?: React.RefObject<Record<string, string>>;
}

function ProgramStateVariables(props: IStateProps): JSX.Element {
  return (
    <View className="px-4 py-2 bg-background-cardpurple rounded-2xl">
      {ObjectUtils_keys(props.state).map((stateKey, i) => {
        const value = props.state[stateKey];
        const displayValue = Weight_is(value) || Weight_isPct(value) ? value.value : value;

        return (
          <MenuItemEditable
            key={stateKey}
            name={stateKey}
            isBorderless={i === Object.keys(props.state).length - 1}
            nextLine={
              props.stateMetadata?.[stateKey]?.userPrompted ? (
                <View style={{ marginTop: -12 }} className="mb-1">
                  <Text className="text-xs text-text-secondary">User Prompted</Text>
                </View>
              ) : undefined
            }
            isNameBold={true}
            type="number"
            value={displayValue.toString()}
            valueUnits={Weight_is(value) || Weight_isPct(value) ? value.unit : undefined}
            hasClear={false}
            onChange={(v) => {
              if (props.pendingRef && v != null) {
                props.pendingRef.current[stateKey] = v;
              }
            }}
            onInput={(v) => {
              if (props.pendingRef) {
                props.pendingRef.current[stateKey] = v;
              }
            }}
          />
        );
      })}
    </View>
  );
}
