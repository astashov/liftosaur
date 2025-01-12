import React, { JSX } from "react";
import { useRef, useState } from "react";
import { Progress } from "../../models/progress";
import { Weight } from "../../models/weight";
import { ScriptRunner } from "../../parser";
import {
  IDayData,
  IEquipment,
  IExerciseType,
  IPercentage,
  IProgramExercise,
  IProgramSet,
  IProgramState,
  ISettings,
  IWeight,
} from "../../types";
import { IEither } from "../../utils/types";
import { DraggableList } from "../draggableList";
import { GroupHeader } from "../groupHeader";
import { IconHandle } from "../icons/iconHandle";
import { IconHelp } from "../icons/iconHelp";
import { IconTrash } from "../icons/iconTrash";
import { LinkButton } from "../linkButton";
import { OneLineTextEditor } from "./oneLineTextEditor";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { Input } from "../input";
import { GestureResponderEvent, TouchableOpacity, View } from "react-native";
import { LftText } from "../lftText";

interface IEditProgramSets {
  programExercise: IProgramExercise;
  dayData: IDayData;
  variationIndex: number;
  settings: ISettings;
  onDeleteVariation?: (variationIndex: number) => void;
  onDuplicateVariation?: (variationIndex: number) => void;
  onChangeMinReps: (reps: string, variationIndex: number, setIndex: number) => void;
  onChangeReps: (reps: string, variationIndex: number, setIndex: number) => void;
  onChangeAmrap: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  onChangeWeight: (weight: string, variationIndex: number, setIndex: number) => void;
  onRemoveSet: (variationIndex: number, setIndex: number) => void;
  onReorderSets: (variationIndex: number, startIndex: number, endIndex: number) => void;
  onChangeLabel: (variationIndex: number, setIndex: number, value: string) => void;
  onChangeRpe: (rpe: string, variationIndex: number, setIndex: number) => void;
  onChangeLogRpe: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  onAddSet: (variationIndex: number) => void;
}

export function EditProgramSets(props: IEditProgramSets): JSX.Element {
  const { programExercise, dayData, settings, variationIndex } = props;
  const variation = programExercise.variations[variationIndex];
  const [resetCounter, setResetCounter] = useState(0);
  const onDeleteVariation = props.onDeleteVariation;
  const onDuplicateVariation = props.onDuplicateVariation;
  return (
    <>
      <GroupHeader
        topPadding={true}
        name={programExercise.variations.length > 1 ? `Sets of Variation ${variationIndex + 1}` : "Sets"}
        rightAddOn={
          <>
            {onDuplicateVariation ? (
              <TouchableOpacity
                style={{ marginTop: -8, marginBottom: -8 }}
                className="p-2 nm-duplicate-variation"
                onPress={() => onDuplicateVariation(variationIndex)}
              >
                <IconDuplicate2 />
              </TouchableOpacity>
            ) : undefined}
            {onDeleteVariation ? (
              <TouchableOpacity
                style={{ marginTop: -8, marginBottom: -8 }}
                className="p-2 nm-delete-variation"
                onPress={() => onDeleteVariation(variationIndex)}
              >
                <IconTrash />
              </TouchableOpacity>
            ) : undefined}
          </>
        }
        help={
          <LftText>
            Sets, reps and weights
            {programExercise.variations.length > 1 && (
              <LftText>
                of chosen <LftText className="font-bold">Variation</LftText>
              </LftText>
            )}
            . Note that <LftText className="font-bold">Reps</LftText> and{" "}
            <LftText className="font-bold">Weight</LftText> fields are Liftoscript scripts, and the returning value will
            be used for reps/weight. <LftText className="font-bold">AMRAP</LftText> means "As Many Reps As Possible",
            i.e. you do as many reps as you can for it.
          </LftText>
        }
      />
      <View className="relative z-10 mt-2 text-sm">
        <DraggableList
          hideBorders={true}
          items={variation.sets}
          element={(set, setIndex, handleTouchStart) => (
            <SetFields
              key={`${resetCounter}_${variation.sets.length}_${programExercise.variations.length}_${variationIndex}`}
              equipment={programExercise.exerciseType.equipment}
              settings={settings}
              handleTouchStart={handleTouchStart}
              dayData={dayData}
              set={set}
              exerciseType={programExercise.exerciseType}
              state={programExercise.state}
              variationIndex={variationIndex}
              setIndex={setIndex}
              enabledRpe={!!programExercise.enableRpe}
              enabledRepRanges={!!programExercise.enableRepRanges}
              isDeleteEnabled={programExercise.quickAddSets || variation.sets.length > 1}
              onChangeAmrap={props.onChangeAmrap}
              onChangeLogRpe={props.onChangeLogRpe}
              onChangeMinReps={props.onChangeMinReps}
              onChangeReps={props.onChangeReps}
              onChangeRpe={props.onChangeRpe}
              onChangeWeight={props.onChangeWeight}
              onRemoveSet={props.onRemoveSet}
              onChangeLabel={props.onChangeLabel}
            />
          )}
          onDragEnd={(startIndex, endIndex) => {
            setResetCounter(resetCounter + 1);
            props.onReorderSets(variationIndex, startIndex, endIndex);
          }}
        />
      </View>
      <View>
        <LinkButton name="add-new-set" data-cy="add-new-set" onPress={() => props.onAddSet(variationIndex)}>
          Add New Set
        </LinkButton>
      </View>
    </>
  );
}

interface ISetFieldsProps {
  state: IProgramState;
  set: IProgramSet;
  dayData: IDayData;
  exerciseType: IExerciseType;
  settings: ISettings;
  variationIndex: number;
  setIndex: number;
  equipment?: IEquipment;
  isDeleteEnabled: boolean;
  enabledRpe: boolean;
  enabledRepRanges: boolean;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  onChangeMinReps: (reps: string, variationIndex: number, setIndex: number) => void;
  onChangeReps: (reps: string, variationIndex: number, setIndex: number) => void;
  onChangeRpe: (rpe: string, variationIndex: number, setIndex: number) => void;
  onChangeAmrap: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  onChangeLogRpe: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  onChangeWeight: (weight: string, variationIndex: number, setIndex: number) => void;
  onRemoveSet: (variationIndex: number, setIndex: number) => void;
  onChangeLabel: (variationIndex: number, setIndex: number, value: string) => void;
}

function SetFields(props: ISetFieldsProps): JSX.Element {
  const { set, state, settings } = props;
  const propsRef = useRef<ISetFieldsProps>(props);
  propsRef.current = props;

  function validate(
    script: string | undefined,
    type: "reps" | "weight" | "rpe"
  ): IEither<number | IWeight | undefined | IPercentage, string> {
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          propsRef.current!.state,
          {},
          Progress.createEmptyScriptBindings(
            propsRef.current!.dayData,
            propsRef.current!.settings,
            propsRef.current!.exerciseType
          ),
          Progress.createScriptFunctions(settings),
          settings.units,
          { exerciseType: props.exerciseType, unit: settings.units, prints: [] },
          "regular"
        );
        if (type === "reps") {
          return { success: true, data: scriptRunnerResult.execute(type) };
        } else if (type === "rpe") {
          return { success: true, data: scriptRunnerResult.execute(type) };
        } else {
          const result = scriptRunnerResult.execute(type);
          return {
            success: true,
            data: Weight.isPct(result) ? result : Weight.convertTo(result, settings.units),
          };
        }
      } else {
        return { success: false, error: "Empty expression" };
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }
  }

  const repsResult = validate(set.repsExpr.trim(), "reps");
  const weightResult = validate(set.weightExpr.trim(), "weight");
  const minRepsResult =
    props.enabledRepRanges && set.minRepsExpr ? validate(set.minRepsExpr.trim(), "reps") : undefined;
  const rpeResult = props.enabledRpe && set.rpeExpr ? validate(set.rpeExpr.trim(), "rpe") : undefined;

  return (
    <View className="relative pb-2">
      <View className="flex flex-row p-1 select-none bg-purplev2-100 rounded-2xl">
        <View className="flex flex-col items-center pt-2">
          <View>
            <SetNumber setIndex={props.setIndex} />
          </View>
          <Handle handleTouchStart={props.handleTouchStart} />
        </View>
        <View className="flex flex-col flex-1 min-w-0">
          <View className="flex flex-row">
            <View className="flex-1 min-w-0">
              {props.enabledRepRanges && (
                <View className="mb-1">
                  <MinRepsInput
                    repsResult={minRepsResult}
                    variationIndex={propsRef.current!.variationIndex}
                    setIndex={propsRef.current!.setIndex}
                    state={state}
                    set={set}
                    onChangeReps={props.onChangeMinReps}
                  />
                </View>
              )}
              <RepsInput
                label={props.enabledRepRanges ? "Max Reps" : "Reps"}
                repsResult={repsResult}
                variationIndex={propsRef.current!.variationIndex}
                setIndex={propsRef.current!.setIndex}
                state={state}
                set={set}
                onChangeReps={props.onChangeReps}
              />
            </View>
            <View className="pt-2 pl-2 pr-1">
              <Amrap
                onChangeAmrap={props.onChangeAmrap}
                set={set}
                variationIndex={propsRef.current!.variationIndex}
                setIndex={propsRef.current!.setIndex}
              />
            </View>
            {props.isDeleteEnabled && (
              <View>
                <DeleteBtn
                  onRemoveSet={props.onRemoveSet}
                  variationIndex={propsRef.current!.variationIndex}
                  setIndex={propsRef.current!.setIndex}
                />
              </View>
            )}
          </View>
          <View className="flex flex-row mt-2">
            <View className="flex-1 min-w-0">
              <WeightInput
                weightResult={weightResult}
                variationIndex={propsRef.current!.variationIndex}
                setIndex={propsRef.current!.setIndex}
                state={state}
                set={set}
                onChangeWeight={props.onChangeWeight}
              />
            </View>
            <View style={{ width: 112 }} className="px-2">
              <Input
                changeHandler={(r) => {
                  if (r.success) {
                    props.onChangeLabel(propsRef.current!.variationIndex, propsRef.current!.setIndex, r.data);
                  }
                }}
                maxLength={8}
                labelSize="xs"
                label="Label"
                value={set.label}
              />
            </View>
          </View>
          {props.enabledRpe && (
            <View className="flex flex-row mt-2">
              <View className="flex-1 min-w-0">
                <RpeInput
                  rpeResult={rpeResult}
                  variationIndex={propsRef.current!.variationIndex}
                  setIndex={propsRef.current!.setIndex}
                  state={state}
                  set={set}
                  onChangeRpe={props.onChangeRpe}
                />
              </View>
              <View className="pt-2 pl-2 pr-1">
                <LogRpe
                  onChangeLogRpe={props.onChangeLogRpe}
                  set={set}
                  variationIndex={propsRef.current!.variationIndex}
                  setIndex={propsRef.current!.setIndex}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function DeleteBtn(props: {
  onRemoveSet: (variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}): JSX.Element {
  return (
    <TouchableOpacity
      className="p-3 nm-remove-set"
      style={{ top: 0, right: 0 }}
      onPress={() => props.onRemoveSet(props.variationIndex, props.setIndex)}
    >
      <IconTrash />
    </TouchableOpacity>
  );
}

function Handle(props: { handleTouchStart?: (e: GestureResponderEvent) => void }): JSX.Element {
  return (
    <TouchableOpacity
      className="p-2 cursor-move"
      onPressIn={(e) => {
        if (props.handleTouchStart) {
          props.handleTouchStart(e);
        }
      }}
    >
      <IconHandle />
    </TouchableOpacity>
  );
}

export function SetNumber(props: { setIndex: number; size?: "md" | "sm" }): JSX.Element {
  return (
    <View
      className={`flex items-center justify-center ${
        props.size === "sm" ? "w-5 h-5" : "w-6 h-6"
      } border rounded-full border-grayv2-main`}
    >
      <LftText className={`${props.size === "sm" ? "font-bold text-xs" : "font-bold"} text-grayv2-main`}>
        {props.setIndex + 1}
      </LftText>
    </View>
  );
}

interface IRepsInputProps {
  state: IProgramState;
  label: string;
  set: IProgramSet;
  repsResult: IEither<number | IWeight | undefined | IPercentage, string>;
  onChangeReps: (reps: string, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function RepsInput(props: IRepsInputProps): JSX.Element {
  return (
    <OneLineTextEditor
      label={props.label}
      name="reps"
      state={props.state}
      value={props.set.repsExpr}
      result={props.repsResult}
      onChange={(value) => {
        props.onChangeReps(value, props.variationIndex, props.setIndex);
      }}
    />
  );
}

interface IMinRepsInputProps {
  state: IProgramState;
  set: IProgramSet;
  repsResult?: IEither<number | IWeight | IPercentage | undefined, string>;
  onChangeReps: (reps: string, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function MinRepsInput(props: IMinRepsInputProps): JSX.Element {
  return (
    <OneLineTextEditor
      label="Min Reps"
      name="minreps"
      state={props.state}
      value={props.set.minRepsExpr}
      result={props.repsResult}
      onChange={(value) => {
        props.onChangeReps(value, props.variationIndex, props.setIndex);
      }}
    />
  );
}

interface IWeightInputProps {
  state: IProgramState;
  set: IProgramSet;
  weightResult: IEither<number | IWeight | undefined | IPercentage, string>;
  onChangeWeight: (weight: string, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function WeightInput(props: IWeightInputProps): JSX.Element {
  return (
    <OneLineTextEditor
      label="Weight"
      name="weight"
      state={props.state}
      value={props.set.weightExpr}
      result={props.weightResult}
      onChange={(value) => {
        props.onChangeWeight(value, props.variationIndex, props.setIndex);
      }}
    />
  );
}

interface IRpeInputProps {
  state: IProgramState;
  set: IProgramSet;
  rpeResult?: IEither<number | IWeight | undefined | IPercentage, string>;
  onChangeRpe: (reps: string, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function RpeInput(props: IRpeInputProps): JSX.Element {
  return (
    <OneLineTextEditor
      label="RPE"
      name="rpe"
      state={props.state}
      value={props.set.rpeExpr}
      result={props.rpeResult}
      onChange={(value) => {
        props.onChangeRpe(value, props.variationIndex, props.setIndex);
      }}
    />
  );
}

interface IAmrapProps {
  set: IProgramSet;
  onChangeAmrap: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function Amrap(props: IAmrapProps): JSX.Element {
  return (
    <label className="text-center">
      <View>
        <input
          checked={props.set.isAmrap}
          className="block checkbox text-bluev2"
          id="variation-0-amrap"
          type="checkbox"
          onChange={(e) => {
            props.onChangeAmrap(e.currentTarget.checked, props.variationIndex, props.setIndex);
          }}
        />
      </View>
      <View className="text-xs leading-none">
        <LftText className="align-middle text-grayv2-main">AMRAP</LftText>{" "}
        <TouchableOpacity className="align-middle nm-amrap-help" onPress={() => alert("As Many Reps As Possible.")}>
          <IconHelp size={12} color="#607284" />
        </TouchableOpacity>
      </View>
    </label>
  );
}

interface ILogRpeProps {
  set: IProgramSet;
  onChangeLogRpe: (isSet: boolean, variationIndex: number, setIndex: number) => void;
  variationIndex: number;
  setIndex: number;
}

function LogRpe(props: ILogRpeProps): JSX.Element {
  return (
    <label className="text-center">
      <View>
        <input
          data-cy="toggle-log-rpe"
          checked={props.set.logRpe}
          className="block checkbox text-bluev2"
          id="variation-0-amrap"
          type="checkbox"
          onChange={(e) => {
            props.onChangeLogRpe(e.currentTarget.checked, props.variationIndex, props.setIndex);
          }}
        />
      </View>
      <View className="text-xs leading-none">
        <LftText className="align-middle text-grayv2-main">Log RPE</LftText>{" "}
        <TouchableOpacity
          className="align-middle nm-log-rpe-help"
          onPress={() =>
            alert(
              "Log RPE (Rate of Perceived Exertion) when finished this set. You can access it in the Finish Day Script in `completedRPE` variable."
            )
          }
        >
          <IconHelp size={12} color="#607284" />
        </TouchableOpacity>
      </View>
    </label>
  );
}
