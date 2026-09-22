import type { JSX } from "react";
import { useCallback, useContext, useMemo, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { WorkoutTabStopContext } from "./workoutTabStopContext";
import { Text } from "./primitives/text";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { IconPlayCircle } from "./icons/iconPlayCircle";
import { IconEdit2 } from "./icons/iconEdit2";
import { IconBarbellPlates } from "./icons/iconBarbellPlates";
import { PlatesBar } from "./platesBar";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { LinkButton } from "./linkButton";
import { InputNumber2 } from "./inputNumber2";
import { InputWeight2 } from "./inputWeight2";
import { WorkoutExerciseUtils_getBgColor100, WorkoutExerciseUtils_getIconColor } from "../utils/workoutExerciseUtils";
import { DateUtils_formatDayMonth } from "../utils/date";
import { ActionMenu, IActionMenuAction } from "./actionMenu";
import type { IWorkoutExerciseSetBodyProps } from "./workoutExerciseSet";
import {
  RpeWeightHint,
  WorkoutExerciseLastSet,
  WorkoutExerciseSetRpeTime,
  WorkoutExerciseSetTargetField,
  WorkoutExerciseSet_dataCy,
} from "./workoutExerciseSetFields";

const COMPLETE_ICON_SIZE = 48;

export function WorkoutExerciseSetExpanded(props: IWorkoutExerciseSetBodyProps): JSX.Element {
  const { set, isUnilateral, columnWidths, onEditTarget, onDeleteSet } = props;
  const onTargetPress = props.isRoundedWeight ? props.onOpenRoundingInfo : props.onToggleExpand;
  const actions = useMemo<IActionMenuAction[]>(() => {
    const list: IActionMenuAction[] = [];
    if (onEditTarget) {
      list.push({ label: "Edit Target", onPress: onEditTarget, testID: "edit-set-target" });
    }
    list.push({ label: "Delete Set", onPress: onDeleteSet, destructive: true, testID: "delete-set" });
    return list;
  }, [onEditTarget, onDeleteSet]);
  const previousLines = props.previousLines ?? [];
  const isSubscribed = props.subscription != null && Subscriptions_hasSubscription(props.subscription);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { onMenuOpenChange } = props;
  const onOpenChange = useCallback(
    (isOpen: boolean) => {
      setIsMenuOpen(isOpen);
      onMenuOpenChange?.(isOpen);
    },
    [onMenuOpenChange]
  );
  const menuZIndex = Platform.OS === "web" && isMenuOpen ? { zIndex: 50 } : undefined;
  const tabIndex = useContext(WorkoutTabStopContext);

  return (
    <View
      className={`${WorkoutExerciseUtils_getBgColor100([set], props.type === "warmup")}`}
      data-testid={WorkoutExerciseSet_dataCy(set)}
      testID={WorkoutExerciseSet_dataCy(set)}
      style={menuZIndex}
    >
      <View className={`border-b ${props.borderColor} pb-2`} style={menuZIndex}>
        <View className="flex-row" style={menuZIndex}>
          <Pressable
            className="items-center justify-center"
            style={{ width: columnWidths.set }}
            disabled={props.onToggleExpand == null}
            onPress={props.onToggleExpand}
          >
            <View
              className="w-scaled-6 h-scaled-6 items-center justify-center"
              style={{
                borderRadius: 9999,
                overflow: "hidden",
                backgroundColor: props.isNext ? Tailwind_semantic().button.primarybackground : "transparent",
              }}
            >
              {props.type === "warmup" ? (
                <Text className={`text-xs ${props.isNext ? "text-text-alwayswhite font-bold" : ""}`}>W</Text>
              ) : (
                <Text className={props.isNext ? "text-text-alwayswhite font-bold" : ""}>{props.setIndex + 1}</Text>
              )}
            </View>
          </Pressable>
          <View className="flex-1" style={menuZIndex}>
            <View className="flex-row items-center" style={menuZIndex}>
              <Pressable
                className="flex-row items-center flex-1 pt-1"
                data-testid="workout-set-row-head"
                testID="workout-set-row-head"
                disabled={onTargetPress == null}
                onPress={onTargetPress}
              >
                <View className="flex-1" data-testid="workout-set-target" testID="workout-set-target">
                  <WorkoutExerciseSetTargetField
                    set={set}
                    lastSet={props.lastSet}
                    setType={props.setType}
                    settings={props.settings}
                    exerciseType={props.exerciseType}
                    underlineRounded={props.isRoundedWeight}
                    sizeClass="text-lg"
                    dimIncomplete={false}
                  />
                </View>
              </Pressable>
              <ActionMenu
                renderTrigger={(open) => (
                  <Pressable
                    data-testid="set-options"
                    testID="set-options"
                    className="px-4 py-2"
                    hitSlop={12}
                    onPress={open}
                  >
                    <IconEdit2 />
                  </Pressable>
                )}
                actions={actions}
                onOpenChange={onOpenChange}
              />
            </View>

            <View className="flex-row items-center gap-2 pr-4">
              {isUnilateral ? (
                <View className="flex-row items-center flex-1 gap-1">
                  <Text className="text-xs text-text-secondary">L</Text>
                  <InputNumber2
                    size="lg"
                    fill={true}
                    tabIndex={tabIndex}
                    tabStop={true}
                    name="set-left-reps"
                    onInput={props.onInputLeftReps}
                    onBlur={props.onBlurLeftReps}
                    placeholder={props.placeholderReps}
                    initialValue={set.reps}
                    value={set.completedRepsLeft != null ? set.completedRepsLeft : undefined}
                    min={0}
                    max={9999}
                    step={1}
                    inputCommitMode="blur"
                  />
                  <Text className="text-xs text-text-secondary">R</Text>
                  <InputNumber2
                    size="lg"
                    fill={true}
                    tabIndex={tabIndex}
                    tabStop={true}
                    name="set-reps"
                    onInput={props.onInputReps}
                    onBlur={props.onBlurReps}
                    placeholder={props.placeholderReps}
                    initialValue={set.reps}
                    value={set.completedReps != null ? set.completedReps : undefined}
                    min={0}
                    max={9999}
                    step={1}
                    inputCommitMode="blur"
                  />
                </View>
              ) : (
                <InputNumber2
                  size="lg"
                  fill={true}
                  tabIndex={tabIndex}
                  tabStop={true}
                  name="set-reps"
                  onInput={props.onInputReps}
                  onBlur={props.onBlurReps}
                  placeholder={props.placeholderReps}
                  initialValue={set.reps}
                  value={set.completedReps != null ? set.completedReps : undefined}
                  min={0}
                  max={9999}
                  step={1}
                  inputCommitMode="blur"
                />
              )}
              <Text className="text-xl text-text-secondary">×</Text>
              <InputWeight2
                size="lg"
                fill={true}
                tabIndex={tabIndex}
                tabStop={true}
                name="set-weight"
                exerciseType={props.exerciseType}
                inputCommitMode="blur"
                onBlur={props.onBlurWeight}
                onInput={props.onInputWeight}
                addOn={
                  set.rpe != null && set.reps != null
                    ? () => (
                        <RpeWeightHint
                          reps={set.completedReps ?? set.reps ?? 0}
                          rpe={set.completedRpe ?? set.rpe!}
                          settings={props.settings}
                          exerciseType={props.exerciseType}
                        />
                      )
                    : undefined
                }
                subscription={props.subscription}
                placeholder={props.placeholderWeight}
                initialValue={set.weight}
                value={set.completedWeight || undefined}
                max={9999}
                min={-9999}
                settings={props.settings}
              />
              {columnWidths.rpe > 0 ? (
                <WorkoutExerciseSetRpeTime
                  set={set}
                  isUnilateral={isUnilateral}
                  completedRpeValue={props.completedRpeValue}
                  sizeClass="text-lg"
                  onEditSetTimer={props.onEditSetTimer}
                />
              ) : null}
              {props.type === "workout" && set.setTimer != null && !set.isCompleted ? (
                <Pressable
                  tabIndex={tabIndex}
                  dataSet={{ tabStop: "1" }}
                  className="py-1 pl-2"
                  data-testid="start-set-timer"
                  testID="start-set-timer"
                  onPress={props.onCompleteSet}
                >
                  <IconPlayCircle size={COMPLETE_ICON_SIZE} color={WorkoutExerciseUtils_getIconColor([set], false)} />
                </Pressable>
              ) : (
                <Pressable
                  tabIndex={tabIndex}
                  dataSet={{ tabStop: "1" }}
                  className="py-1 pl-2"
                  data-testid="complete-set"
                  testID="complete-set"
                  onPress={props.onCompleteSet}
                >
                  <IconCheckCircle
                    size={COMPLETE_ICON_SIZE}
                    isChecked={true}
                    color={WorkoutExerciseUtils_getIconColor([set], props.type === "warmup")}
                  />
                </Pressable>
              )}
            </View>

            {props.platesLine && (
              <Pressable
                className="flex-row items-center gap-2 pr-4 mt-1"
                testID="set-plates"
                disabled={props.onToggleExpand == null}
                onPress={props.onToggleExpand}
              >
                {isSubscribed && props.platesLine.isMatch ? (
                  <PlatesBar plates={props.platesLine.sidePlates} />
                ) : (
                  <IconBarbellPlates size={isSubscribed ? 24 : 17} />
                )}
                {isSubscribed ? (
                  <Text
                    className={`text-2xl font-semibold ${props.platesLine.isMatch ? "text-text-primary" : "text-text-error"}`}
                    data-testid="set-plates-list"
                    testID="set-plates-list"
                  >
                    {props.platesLine.plates}
                  </Text>
                ) : (
                  <LinkButton name="see-plates-for-each-side" className="text-xs" onClick={props.onOpenSubscription}>
                    See plates for each side
                  </LinkButton>
                )}
              </Pressable>
            )}

            {previousLines.length > 0 && (
              <Pressable
                className="pr-4 mt-1"
                testID="set-previous-lines"
                disabled={props.onToggleExpand == null}
                onPress={props.onToggleExpand}
              >
                {previousLines.map((line) => (
                  <View key={line.label} className="flex-row flex-wrap items-center gap-1">
                    <Text className="text-xs text-text-secondary">{line.label}:</Text>
                    <WorkoutExerciseLastSet set={line.set} sizeClass="text-xs" />
                    <Text className="text-xs text-text-secondary">· {DateUtils_formatDayMonth(line.timestamp)}</Text>
                  </View>
                ))}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
