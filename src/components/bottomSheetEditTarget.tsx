import { JSX, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { Switch } from "./primitives/switch";
import { BottomSheet } from "./bottomSheet";
import { IHistoryRecord, IProgressUi, ISettings, ISubscription } from "../types";
import { MenuItemWrapper } from "./menuItem";
import { InputNumber2 } from "./inputNumber2";
import { IDispatch } from "../ducks/types";
import { InputWeight2 } from "./inputWeight2";
import { MenuItemEditable } from "./menuItemEditable";
import { IconTrash } from "./icons/iconTrash";
import { lb } from "lens-shmens";
import { updateProgress } from "../models/state";
import { Weight_build, Weight_evaluateWeight, Weight_roundConvertTo } from "../models/weight";
import { Button } from "./button";
import { FocusedInputFlush_flush } from "../utils/focusedInputFlush";

interface IBottomSheetEditTargetProps {
  isHidden: boolean;
  progress: IHistoryRecord;
  settings: ISettings;
  editSetModal: IProgressUi["editSetModal"];
  subscription?: ISubscription;
  dispatch: IDispatch;
  onClose: () => void;
}

export type IBottomSheetEditTargetContentProps = Omit<IBottomSheetEditTargetProps, "isHidden"> & {
  editSetModal: Required<IProgressUi>["editSetModal"];
};

export function BottomSheetEditTargetContent(props: IBottomSheetEditTargetContentProps): JSX.Element {
  const set = props.editSetModal.set;
  const [enableRpe, setEnableRpe] = useState(set.rpe != null);
  const [enableSetTimer, setEnableSetTimer] = useState(set.setTimer != null);
  const [enableTimer, setEnableTimer] = useState(set.timer != null);
  const lbSet = lb<IHistoryRecord>().pi("ui", {}).pi("editSetModal").pi("set");
  const savedRef = useRef(false);

  return (
    <View className="px-4 pt-2 pb-4">
      <Text className="py-2 text-base font-semibold text-center">Edit Set Target</Text>
      <MenuItemWrapper name="edit-set-target-reps">
        <View className="flex-row items-center py-2">
          <View className="flex-1">
            <Text className="text-sm font-semibold">Reps</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-text-secondary">Min</Text>
            <View className="mr-2">
              <InputNumber2
                width={2.5}
                name="target-minreps"
                onBlur={(value) => {
                  if (savedRef.current) {
                    return;
                  }
                  updateProgress(props.dispatch, [lbSet.p("minReps").record(value)], "target-blur-minreps");
                }}
                onInput={(value) => {
                  if (savedRef.current) {
                    return;
                  }
                  if (value != null && !isNaN(value) && value >= 0) {
                    updateProgress(props.dispatch, [lbSet.p("minReps").record(value)], "target-input-minreps");
                  }
                }}
                value={set.minReps}
                min={0}
                max={9999}
                step={1}
              />
            </View>
            <Text className="text-xs text-text-secondary">Max</Text>
            <View className="mr-3">
              <InputNumber2
                width={2.5}
                name="target-maxreps"
                onBlur={(value) => {
                  if (savedRef.current) {
                    return;
                  }
                  updateProgress(props.dispatch, [lbSet.p("reps").record(value)], "target-blur-maxreps");
                }}
                onInput={(value) => {
                  if (savedRef.current) {
                    return;
                  }
                  if (value == null || (!isNaN(value) && value >= 0)) {
                    updateProgress(props.dispatch, [lbSet.p("reps").record(value)], "target-input-maxreps");
                  }
                }}
                value={set.reps}
                min={0}
                max={9999}
                step={1}
              />
            </View>
            <View className="flex-row items-center">
              <Text className="mr-1 text-xs">AMRAP?</Text>
              <Switch
                value={set.isAmrap}
                testID="edit-target-amrap"
                data-testid="edit-target-amrap"
                onValueChange={() => {
                  updateProgress(props.dispatch, [lbSet.p("isAmrap").record(!set.isAmrap)], "amrap-checkbox");
                }}
              />
            </View>
          </View>
        </View>
      </MenuItemWrapper>
      <MenuItemWrapper name="edit-set-target-weight">
        <View className="flex-row items-center py-2">
          <View className="flex-1">
            <Text className="text-sm font-semibold">Weight</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center mr-3">
              <InputWeight2
                name="target-weight"
                subscription={props.subscription}
                exerciseType={props.editSetModal.exerciseType}
                inputCommitMode="blur"
                onBlur={(value) => {
                  if (savedRef.current) {
                    return;
                  }
                  updateProgress(
                    props.dispatch,
                    [lbSet.p("originalWeight").record(value ?? Weight_build(0, "lb"))],
                    "target-blur-weight"
                  );
                }}
                onInput={(value) => {
                  if (savedRef.current) {
                    return;
                  }
                  if (value != null) {
                    updateProgress(
                      props.dispatch,
                      [lbSet.p("originalWeight").record(value ?? Weight_build(0, "lb"))],
                      "target-input-weight"
                    );
                  }
                }}
                units={["lb", "kg", "%"] as const}
                value={set.originalWeight}
                max={9999}
                min={-9999}
                settings={props.settings}
              />
              <Text className="ml-1 text-xs text-text-secondary">
                {set.originalWeight?.unit ?? props.settings.units}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="mr-1 text-xs">Ask?</Text>
              <Switch
                value={set.askWeight}
                testID="edit-target-ask-weight"
                data-testid="edit-target-ask-weight"
                onValueChange={() => {
                  updateProgress(props.dispatch, [lbSet.p("askWeight").record(!set.askWeight)], "ask-weight-checkbox");
                }}
              />
            </View>
          </View>
        </View>
      </MenuItemWrapper>
      {!enableRpe ? (
        <View className="font-semibold">
          <MenuItemEditable
            size="sm"
            type="boolean"
            name="Enable RPE?"
            value={set.rpe != null ? "true" : "false"}
            onChange={() => {
              setEnableRpe(true);
            }}
          />
        </View>
      ) : (
        <MenuItemWrapper name="edit-set-target-rpe">
          <View className="flex-row items-center py-1">
            <View className="flex-1">
              <Text className="text-sm font-semibold">RPE</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center mr-3">
                <InputNumber2
                  allowDot={true}
                  width={2.5}
                  name="target-rpe"
                  onBlur={(value) => {
                    if (savedRef.current) {
                      return;
                    }
                    updateProgress(props.dispatch, [lbSet.p("rpe").record(value)], "target-blur-rpe");
                  }}
                  onInput={(value) => {
                    if (savedRef.current) {
                      return;
                    }
                    if (value != null && !isNaN(value) && value >= 0) {
                      updateProgress(props.dispatch, [lbSet.p("rpe").record(value)], "target-input-rpe");
                    }
                  }}
                  value={set.rpe}
                  min={0}
                  max={10}
                  step={0.5}
                />
              </View>
              <View className="flex-row items-center">
                <Text className="mr-1 text-xs">Log?</Text>
                <Switch
                  value={set.logRpe}
                  testID="edit-target-log-rpe"
                  data-testid="edit-target-log-rpe"
                  onValueChange={() => {
                    updateProgress(props.dispatch, [lbSet.p("logRpe").record(!set.logRpe)], "log-rpe-checkbox");
                  }}
                />
              </View>
              <Pressable
                className="p-2"
                style={{ marginRight: -8 }}
                onPress={() => {
                  setEnableRpe(false);
                  updateProgress(
                    props.dispatch,
                    [lbSet.p("logRpe").record(false), lbSet.p("rpe").record(undefined)],
                    "clear-rpe"
                  );
                }}
              >
                <IconTrash width={15} height={20} />
              </Pressable>
            </View>
          </View>
        </MenuItemWrapper>
      )}
      {!enableSetTimer ? (
        <View className="font-semibold">
          <MenuItemEditable
            size="sm"
            type="boolean"
            name="Enable Set Timer?"
            value={set.setTimer != null ? "true" : "false"}
            onChange={() => {
              setEnableSetTimer(true);
              updateProgress(props.dispatch, [lbSet.p("setTimer").record(30)], "target-enable-set-timer");
            }}
          />
        </View>
      ) : (
        <MenuItemWrapper name="edit-set-target-set-timer">
          <View className="flex-row items-center py-1">
            <View className="flex-1">
              <Text className="text-sm font-semibold">Set Timer</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center mr-3">
                <InputNumber2
                  width={3.5}
                  name="target-set-timer"
                  after={() =>
                    set.isOverflowSetTimer ? <Text className="text-xs text-text-secondary">+</Text> : undefined
                  }
                  keyboardAddon={
                    <View className="flex-row items-center py-2">
                      <Text className="mr-2 text-sm font-semibold">Count up past target?</Text>
                      <Switch
                        value={!!set.isOverflowSetTimer}
                        testID="edit-target-overflow-set-timer"
                        data-testid="edit-target-overflow-set-timer"
                        onValueChange={(value) => {
                          updateProgress(
                            props.dispatch,
                            [lbSet.p("isOverflowSetTimer").record(value || undefined)],
                            "overflow-set-timer-checkbox"
                          );
                        }}
                      />
                    </View>
                  }
                  onBlur={(value) => {
                    if (savedRef.current) {
                      return;
                    }
                    updateProgress(props.dispatch, [lbSet.p("setTimer").record(value)], "target-blur-set-timer");
                  }}
                  onInput={(value) => {
                    if (savedRef.current) {
                      return;
                    }
                    if (value != null && !isNaN(value) && value >= 0) {
                      updateProgress(props.dispatch, [lbSet.p("setTimer").record(value)], "target-input-set-timer");
                    }
                  }}
                  value={set.setTimer}
                  min={0}
                  max={9999}
                  step={15}
                />
                <Text className="ml-1 text-xs text-text-secondary">s</Text>
              </View>
              <Pressable
                className="p-2"
                style={{ marginRight: -8 }}
                onPress={() => {
                  setEnableSetTimer(false);
                  updateProgress(
                    props.dispatch,
                    [lbSet.p("setTimer").record(undefined), lbSet.p("isOverflowSetTimer").record(undefined)],
                    "target-clear-set-timer"
                  );
                }}
              >
                <IconTrash width={15} height={20} />
              </Pressable>
            </View>
          </View>
        </MenuItemWrapper>
      )}
      {!enableTimer ? (
        <View className="font-semibold">
          <MenuItemEditable
            size="sm"
            type="boolean"
            name="Enable Custom Rest Timer?"
            value={set.timer ? "true" : "false"}
            onChange={() => {
              setEnableTimer(true);
            }}
          />
        </View>
      ) : (
        <MenuItemWrapper name="edit-set-target-timer">
          <View className="flex-row items-center py-1">
            <View className="flex-1">
              <Text className="text-sm font-semibold">Rest Timer</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center mr-3">
                <InputNumber2
                  width={2.5}
                  name="target-timer"
                  onBlur={(value) => {
                    if (savedRef.current) {
                      return;
                    }
                    updateProgress(props.dispatch, [lbSet.p("timer").record(value)], "target-blur-timer");
                  }}
                  onInput={(value) => {
                    if (savedRef.current) {
                      return;
                    }
                    if (value != null && !isNaN(value) && value >= 0) {
                      updateProgress(props.dispatch, [lbSet.p("timer").record(value)], "target-input-timer");
                    }
                  }}
                  value={set.timer}
                  min={0}
                  max={600}
                  step={5}
                />
                <Text className="ml-1 text-xs text-text-secondary">s</Text>
              </View>
              <Pressable
                className="p-2"
                style={{ marginRight: -8 }}
                onPress={() => {
                  setEnableTimer(false);
                  updateProgress(props.dispatch, [lbSet.p("timer").record(undefined)], "target-clear-timer");
                }}
              >
                <IconTrash width={15} height={20} />
              </Pressable>
            </View>
          </View>
        </MenuItemWrapper>
      )}
      <View className="my-4">
        <Button
          kind="purple"
          name="edit-set-target-save"
          data-testid="edit-set-target-save"
          testID="edit-set-target-save"
          className="w-full"
          onClick={() => {
            FocusedInputFlush_flush();
            savedRef.current = true;
            const entryIndex = props.editSetModal.entryIndex;
            const setIndex = props.editSetModal.setIndex ?? 0;
            const exerciseType = props.editSetModal.exerciseType;
            const settings = props.settings;
            updateProgress(
              props.dispatch,
              [
                lb<IHistoryRecord>().recordModify((progress) => {
                  const freshSet = progress.ui?.editSetModal?.set ?? progress.entries[entryIndex]?.sets[setIndex];
                  if (!freshSet) {
                    return progress;
                  }
                  const evaluatedWeight = freshSet.originalWeight
                    ? Weight_evaluateWeight(freshSet.originalWeight, exerciseType ?? { id: "squat" }, settings)
                    : undefined;
                  const weight = evaluatedWeight
                    ? Weight_roundConvertTo(evaluatedWeight, settings, evaluatedWeight.unit, exerciseType)
                    : undefined;
                  const reps = freshSet.minReps != null && freshSet.reps == null ? freshSet.minReps : freshSet.reps;
                  const minReps = freshSet.minReps != null && freshSet.reps == null ? undefined : freshSet.minReps;
                  const newSet = { ...freshSet, weight, reps, minReps };
                  const newEntries = progress.entries.map((entry, i) => {
                    if (i !== entryIndex) {
                      return entry;
                    }
                    const newSets = entry.sets.map((s, j) => (j === setIndex ? newSet : s));
                    return { ...entry, sets: newSets };
                  });
                  return {
                    ...progress,
                    entries: newEntries,
                    ui: { ...(progress.ui ?? {}), editSetModal: undefined },
                  };
                }),
              ],
              "save-target"
            );
          }}
        >
          Save
        </Button>
      </View>
    </View>
  );
}

export const BottomSheetEditTarget = (props: IBottomSheetEditTargetProps): JSX.Element => {
  const editSetModal = props.editSetModal;
  return (
    <BottomSheet shouldShowClose={true} onClose={props.onClose} isHidden={props.isHidden}>
      {editSetModal && (
        <BottomSheetEditTargetContent
          editSetModal={editSetModal}
          subscription={props.subscription}
          settings={props.settings}
          progress={props.progress}
          dispatch={props.dispatch}
          onClose={props.onClose}
        />
      )}
    </BottomSheet>
  );
};
