import { Reps } from "../models/set";
import { IExerciseType, ISettings, ISet } from "../types";
import { n } from "../utils/math";
import { LftText } from "./lftText";
import { View, TouchableOpacity, Pressable } from "react-native";

interface IProps {
  exercise: IExerciseType;
  showHelp?: boolean;
  isCurrent: boolean;
  settings: ISettings;
  set: ISet;
  isEditMode: boolean;
  size?: "small" | "medium";
  onLongPress?: () => void;
  onClick: () => void;
}

export const ExerciseSetView = (props: IProps): JSX.Element => {
  const set = props.set;
  const subtitle = `${n(set.weight.value)}${set.completedReps == null && set.askWeight ? "+" : ""}`;

  let cy: string;
  let color: "red" | "green" | "gray" | "yellow";
  let title;
  let rightSuperstring;
  let leftSuperstring: string | undefined;
  let leftSuperstringColor: "orange" | "gray" | undefined;
  let shinyBorder;
  if (set.isAmrap) {
    title = set.completedReps == null ? Reps.displayReps(set) : set.completedReps;
    rightSuperstring = set.completedReps != null ? `${set.reps}+` : undefined;
    if (set.completedReps == null) {
      cy = "set-amrap-nonstarted";
      color = "gray";
    } else if (set.minReps != null && set.completedReps < set.minReps) {
      cy = "set-amrap-incompleted";
      color = "red";
    } else if (set.minReps != null && set.completedReps < set.reps) {
      cy = "set-amrap-in-range";
      color = "yellow";
    } else if (set.completedReps < set.reps) {
      cy = "set-amrap-incompleted";
      color = "red";
    } else {
      cy = "set-amrap-completed";
      color = "green";
    }
  } else if (set.completedReps == null) {
    title = Reps.displayReps(set);
    cy = "set-nonstarted";
    color = "gray";
    shinyBorder = true;
  } else {
    title = Reps.displayCompletedReps(set);
    if (set.completedReps >= set.reps) {
      cy = "set-completed";
      color = "green";
    } else if (set.minReps != null && set.completedReps >= set.minReps) {
      cy = "set-in-range";
      color = "yellow";
    } else {
      cy = "set-incompleted";
      color = "red";
    }
  }

  if (set.rpe != null || set.completedRpe != null) {
    leftSuperstring = set.completedRpe != null ? `@${set.completedRpe}` : `@${set.rpe}`;
    leftSuperstringColor = set.completedRpe != null ? "orange" : "gray";
  } else if (set.logRpe) {
    leftSuperstring = "@?";
    leftSuperstringColor = "gray";
  }

  return (
    <ExerciseSetBase
      cy={cy}
      showHelp={props.showHelp}
      onClick={props.onClick}
      title={title}
      subtitle={subtitle}
      leftSuperstring={leftSuperstring}
      leftSuperstringColor={leftSuperstringColor}
      rightSuperstring={rightSuperstring}
      shinyBorder={shinyBorder}
      size={props.size}
      onLongPress={props.onLongPress}
      color={color}
    />
  );
};

interface IExerciseSetBaseProps {
  cy: string;
  showHelp?: boolean;
  title: string | number;
  subtitle: string | number;
  leftSuperstring?: string;
  leftSuperstringColor?: "gray" | "orange";
  rightSuperstring?: string;
  color: "gray" | "red" | "green" | "yellow";
  shinyBorder?: boolean;
  size?: "small" | "medium";
  onClick: () => void;
  onLongPress?: () => void;
}

function ExerciseSetBase(props: IExerciseSetBaseProps): JSX.Element {
  const size = props.size || "medium";
  const sizeClassNames = size === "small" ? "w-10 h-10 text-xs" : "w-12 h-12";
  let className = `ls-progress ${sizeClassNames} relative leading-7 text-center border rounded-lg flex flex-col items-center justify-center`;
  if (props.color === "green") {
    className += ` bg-greenv2-300 border-greenv2-400`;
  } else if (props.color === "red") {
    className += ` bg-redv2-300 border-redv2-400`;
  } else if (props.color === "yellow") {
    className += ` bg-orange-200 border-orange-400`;
  } else {
    className += ` bg-grayv2-50 border-grayv2-200`;
  }

  const button = (
    <Pressable
      key={props.cy}
      data-help-id={props.showHelp ? "progress-set" : undefined}
      data-help={`Press here to record completed ${props.title} reps, press again to lower completed reps.`}
      data-help-width={200}
      data-cy={props.cy}
      className={className}
      onLongPress={props.onLongPress}
      delayLongPress={500}
      onPress={props.onClick}
    >
      {props.rightSuperstring != null && (
        <View
          data-cy="reps-completed-amrap"
          style={{ top: -9, right: -5 }}
          className="absolute p-1 text-xs leading-none text-right text-white rounded-full bg-purplev2-600 border-purplev2-800"
        >
          <LftText style={{ fontSize: 10 }}>{props.rightSuperstring}</LftText>
        </View>
      )}
      {props.leftSuperstring != null && (
        <View
          data-cy={props.leftSuperstringColor === "orange" ? "left-superscript-completed" : "left-superscript"}
          style={{ top: -9, left: -4 }}
          className={`absolute p-1 text-xs leading-none text-right text-white rounded-full ${
            props.leftSuperstringColor === "orange" ? "bg-orangev2" : "bg-grayv2-main"
          }`}
        >
          <LftText style={{ fontSize: 10 }}>{props.leftSuperstring}</LftText>
        </View>
      )}
      <LftText className="pt-1 font-bold leading-none" data-cy="reps-value">
        {props.title}
      </LftText>
      <LftText data-cy="weight-value" style={{ marginTop: -2 }} className="pt-1 text-xs leading-none text-grayv2-600">
        {props.subtitle}
      </LftText>
    </Pressable>
  );
  return props.shinyBorder && props.showHelp ? <View className="shiny-border">{button}</View> : button;
}
