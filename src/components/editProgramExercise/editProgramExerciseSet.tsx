import { JSX, Dispatch, SetStateAction } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { Switch } from "../primitives/switch";
import {
  IPlannerExerciseState,
  IPlannerExerciseUi,
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSet,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { SwipeableRow } from "../swipeableRow";
import { InputNumber2 } from "../inputNumber2";
import { InputWeight2 } from "../inputWeight2";
import { lb } from "lens-shmens";
import { EditProgramUiHelpers_changeCurrentInstance2 } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { CollectionUtils_removeAt } from "../../utils/collection";
import { navigationRef } from "../../navigation/navigationRef";

export interface IEditSetColumnSpec {
  width?: number;
  flex?: number;
}

export interface IEditSetColumnWidths {
  set: IEditSetColumnSpec;
  minReps: IEditSetColumnSpec;
  dash: IEditSetColumnSpec;
  reps: IEditSetColumnSpec;
  x: IEditSetColumnSpec;
  weight: IEditSetColumnSpec;
  rpe: IEditSetColumnSpec;
  timer: IEditSetColumnSpec;
}

interface IEditSetColumnOpts {
  hasMinReps: boolean;
  hasWeight: boolean;
  hasRpe: boolean;
  hasTimer: boolean;
}

export function computeEditSetColumnWidths(remValue: number, opts: IEditSetColumnOpts): IEditSetColumnWidths {
  return {
    set: { width: Math.round(2.5 * remValue) },
    minReps: opts.hasMinReps ? { flex: 1 } : { width: 0 },
    dash: opts.hasMinReps ? { width: Math.round(0.75 * remValue) } : { width: 0 },
    reps: { flex: 1 },
    x: opts.hasWeight ? { width: Math.round(0.75 * remValue) } : { width: 0 },
    weight: opts.hasWeight ? { flex: 1.4 } : { width: 0 },
    rpe: opts.hasRpe ? { flex: 1 } : { width: 0 },
    timer: opts.hasTimer ? { flex: 1 } : { width: 0 },
  };
}

interface IEditProgramExerciseSetProps {
  set: IPlannerProgramExerciseEvaluatedSet;
  plannerExercise: IPlannerProgramExercise;
  setIndex: number;
  ui: IPlannerExerciseUi;
  setVariationIndex: number;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  setIds: string[];
  setSetIds: Dispatch<SetStateAction<string[]>>;
  settings: ISettings;
  columnWidths: IEditSetColumnWidths;
  exerciseStateKey: string;
  programId: string;
  opts: IEditSetColumnOpts;
}

export function EditProgramExerciseSet(props: IEditProgramExerciseSetProps): JSX.Element {
  const { set, setIndex, setVariationIndex, columnWidths } = props;
  const lbUi = lb<IPlannerExerciseState>().pi("ui");
  const plannerExercise = props.plannerExercise;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const reusingSets = plannerExercise.reuse != null && plannerExercise.setVariations.length === 0;
  const reusingWeights = reusingSets && plannerExercise.globals.weight == null;
  const reusingRpe = reusingSets && plannerExercise.globals.rpe == null;
  const reusingTimer = reusingSets && plannerExercise.globals.timer == null;

  function changeSet(cb: (s: IPlannerProgramExerciseEvaluatedSet) => void): void {
    if (!plannerExercise) {
      return;
    }
    props.plannerDispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers_changeCurrentInstance2(program, plannerExercise, props.settings, true, (ex) => {
          const setVariation = ex.evaluatedSetVariations[setVariationIndex];
          const s = setVariation.sets[setIndex];
          cb(s);
        });
      }),
      "Update set"
    );
  }

  const repsInputWidth = 2.5;
  const weightInputWidth = 3.5;
  const rpeInputWidth = 2.5;
  const timerInputWidth = 2.5;

  return (
    <SwipeableRow width={128} openThreshold={30} closeThreshold={110} scrollThreshold={7} initiateTreshold={8}>
      {({ style, close, moveRef }) => (
        <View ref={moveRef as unknown as React.RefObject<View>} style={style as object}>
          <View className="flex-row items-center border-b border-border-cardpurple">
            <View style={columnWidths.set} className="items-center justify-center py-1">
              <View className="items-center justify-center h-6 rounded-full">
                <Text className="text-sm">{setIndex + 1}</Text>
                {set.label && <Text className="text-xs text-text-secondary">{set.label}</Text>}
              </View>
            </View>
            {props.opts.hasMinReps && (
              <>
                {set.minrep != null ? (
                  <>
                    <View style={columnWidths.minReps} className="items-center justify-center py-2">
                      <View style={{ opacity: reusingSets ? 0.5 : 1 }}>
                        <InputNumber2
                          width={2.5}
                          data-cy="min-reps-value"
                          name="set-min-reps"
                          onBlur={(value) => {
                            if (value != null && !isNaN(value)) {
                              changeSet((s) => (s.minrep = value));
                            }
                          }}
                          onInput={(value) => {
                            if (value != null && !isNaN(value)) {
                              changeSet((s) => (s.minrep = value));
                            }
                          }}
                          value={set.minrep}
                          min={0}
                          max={999}
                          step={1}
                        />
                      </View>
                    </View>
                    <View style={columnWidths.dash} className="items-center justify-center">
                      <Text>-</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={columnWidths.minReps} />
                    <View style={columnWidths.dash} />
                  </>
                )}
              </>
            )}
            <View style={columnWidths.reps} className="items-center justify-center py-2">
              <View style={{ opacity: reusingSets ? 0.3 : 1 }} className="flex-row items-center justify-center">
                <InputNumber2
                  width={repsInputWidth}
                  data-cy="reps-value"
                  name="set-reps"
                  onBlur={(value) => {
                    if (value != null && !isNaN(value)) {
                      changeSet((s) => (s.maxrep = value));
                    }
                  }}
                  onInput={(value) => {
                    if (value != null && !isNaN(value)) {
                      changeSet((s) => (s.maxrep = value));
                    }
                  }}
                  after={() => (set.isAmrap ? <Text className="text-xs text-text-secondary">+</Text> : undefined)}
                  keyboardAddon={
                    <View className="py-2">
                      <InputNumberAddOn
                        data-cy="keyboard-addon-amrap"
                        label="Is AMRAP?"
                        value={set.isAmrap}
                        onChange={(value) => {
                          changeSet((s) => (s.isAmrap = value));
                        }}
                      />
                    </View>
                  }
                  value={set.maxrep}
                  min={0}
                  max={999}
                  step={1}
                />
              </View>
            </View>
            {props.opts.hasWeight && (
              <>
                <View style={columnWidths.x} className="items-center justify-center py-2">
                  <Text data-cy="set-x">×</Text>
                </View>
                {set.weight != null ? (
                  <View style={columnWidths.weight} className="items-center justify-center py-2">
                    <View style={{ opacity: reusingWeights ? 0.3 : 1 }} className="flex-row items-center">
                      <InputWeight2
                        name="set-weight"
                        width={weightInputWidth}
                        exerciseType={props.plannerExercise.exerciseType}
                        data-cy="weight-value"
                        units={["lb", "kg", "%"] as const}
                        onBlur={(value) => {
                          if (value != null) {
                            changeSet((s) => (s.weight = value));
                          }
                        }}
                        onInput={(value) => {
                          if (value != null) {
                            changeSet((s) => (s.weight = value));
                          }
                        }}
                        showUnitInside={true}
                        subscription={undefined}
                        value={set.weight}
                        after={() =>
                          set.askWeight ? <Text className="text-xs text-text-secondary">+</Text> : undefined
                        }
                        max={9999}
                        min={-9999}
                        settings={props.settings}
                        addOn={() => (
                          <InputNumberAddOn
                            data-cy="keyboard-addon-ask-weight"
                            label="Ask Weight?"
                            value={set.askWeight}
                            onChange={(value) => {
                              changeSet((s) => (s.askWeight = value));
                            }}
                          />
                        )}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={columnWidths.weight} />
                )}
              </>
            )}
            {props.opts.hasRpe &&
              (set.rpe != null ? (
                <View style={columnWidths.rpe} className="items-center justify-center py-2">
                  <View style={{ opacity: reusingRpe ? 0.3 : 1 }} className="flex-row items-center justify-center">
                    <InputNumber2
                      width={rpeInputWidth}
                      data-cy="rpe-value"
                      allowDot={true}
                      name="set-rpe"
                      after={() => (set.logRpe ? <Text className="text-xs text-text-secondary">+</Text> : undefined)}
                      keyboardAddon={
                        <View className="py-2">
                          <InputNumberAddOn
                            label="Log RPE?"
                            data-cy="keyboard-addon-log-rpe"
                            value={set.logRpe}
                            onChange={(value) => {
                              changeSet((s) => (s.logRpe = value));
                            }}
                          />
                        </View>
                      }
                      onBlur={(value) => {
                        if (value != null && !isNaN(value)) {
                          changeSet((s) => (s.rpe = value));
                        }
                      }}
                      onInput={(value) => {
                        if (value != null && !isNaN(value)) {
                          changeSet((s) => (s.rpe = value));
                        }
                      }}
                      value={set.rpe}
                      min={0}
                      max={10}
                      step={0.5}
                    />
                  </View>
                </View>
              ) : (
                <View style={columnWidths.rpe} />
              ))}
            {props.opts.hasTimer &&
              (set.timer != null ? (
                <View style={columnWidths.timer} className="items-center justify-center py-2">
                  <View style={{ opacity: reusingTimer ? 0.3 : 1 }} className="flex-row items-center justify-center">
                    <InputNumber2
                      width={timerInputWidth}
                      data-cy="set-timer"
                      name="timer-value"
                      onBlur={(value) => {
                        if (value != null && !isNaN(value)) {
                          changeSet((s) => (s.timer = value));
                        }
                      }}
                      onInput={(value) => {
                        if (value != null && !isNaN(value)) {
                          changeSet((s) => (s.timer = value));
                        }
                      }}
                      value={set.timer}
                      min={0}
                      max={9999}
                      step={15}
                    />
                  </View>
                </View>
              ) : (
                <View style={columnWidths.timer} />
              ))}
          </View>
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "100%",
              flexDirection: "row",
              width: 128,
              marginLeft: 1,
            }}
          >
            <Pressable
              data-cy="edit-set"
              testID="edit-set"
              style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
              className="bg-background-darkgray"
              onPress={() => {
                close();
                props.plannerDispatch(
                  lbUi.p("editSetBottomSheet").record({
                    exerciseKey: props.plannerExercise.key,
                    setVariationIndex: props.setVariationIndex,
                    setIndex: props.setIndex,
                    dayInWeekIndex: props.plannerExercise.dayData.dayInWeek - 1,
                  }),
                  "Open edit set bottom sheet"
                );
                navigationRef.navigate("editProgramExerciseSetModal", {
                  exerciseStateKey: props.exerciseStateKey,
                  programId: props.programId,
                });
              }}
            >
              <Text className="text-text-alwayswhite">Edit</Text>
            </Pressable>
            <Pressable
              data-cy="delete-set"
              testID="delete-set"
              style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
              className="bg-background-darkred"
              onPress={() => {
                close();
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers_changeCurrentInstance2(
                      program,
                      plannerExercise,
                      props.settings,
                      true,
                      (ex) => {
                        const setVariation = ex.evaluatedSetVariations[setVariationIndex];
                        const sets = [...setVariation.sets];
                        setVariation.sets = CollectionUtils_removeAt(sets, setIndex);
                      }
                    );
                  }),
                  "Delete set"
                );
                props.setSetIds((prev) => CollectionUtils_removeAt(prev, setIndex));
              }}
            >
              <Text className="text-text-alwayswhite">Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SwipeableRow>
  );
}

export interface IInputNumberAddOnProps {
  label: string;
  value: boolean;
  "data-cy"?: string;
  onChange: (value: boolean) => void;
}

export function InputNumberAddOn(props: IInputNumberAddOnProps): JSX.Element {
  return (
    <View className="flex-row items-center">
      <Text className="mr-2 text-sm font-semibold">{props.label}</Text>
      <Switch
        value={props.value}
        data-cy={props["data-cy"]}
        testID={props["data-cy"]}
        onValueChange={(v) => {
          props.onChange(v);
        }}
      />
    </View>
  );
}
