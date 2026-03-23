import React from "react";
import { View, Text, Pressable } from "react-native";
import type {
  IEvaluatedProgram,
} from "@shared/models/program";
import {
  Program_getDiffState,
  Program_getDiffVars,
  Program_runExerciseFinishDayScript,
} from "@shared/models/program";
import { ObjectUtils_isNotEmpty, ObjectUtils_keys } from "@shared/utils/object";
import { Weight_print } from "@shared/models/weight";
import { Reps_isFinished } from "@shared/models/set";
import type { IHistoryEntry, ISettings, IProgramState, IDayData, IPercentage, IWeight, IStats } from "@shared/types";
import type { IPlannerProgramExercise } from "@shared/pages/planner/models/types";
import { PlannerProgramExercise_getState } from "@shared/pages/planner/models/plannerProgramExercise";

interface IProps {
  entry: IHistoryEntry;
  settings: ISettings;
  dayData: IDayData;
  programExercise: IPlannerProgramExercise;
  program: IEvaluatedProgram;
  stats: IStats;
  userPromptedStateVars?: IProgramState;
  onSuppressProgress?: (isSuppressed: boolean) => void;
  forceShow?: boolean;
}

export function ProgressStateChanges(props: IProps): React.ReactElement | null {
  const state = PlannerProgramExercise_getState(props.programExercise);
  const { entry, settings, dayData } = props;
  const { units } = settings;
  const result = Program_runExerciseFinishDayScript(
    entry,
    dayData,
    settings,
    state,
    props.program.states,
    props.programExercise,
    props.stats,
    props.userPromptedStateVars
  );
  const isFinished = Reps_isFinished(entry.sets);
  const updatePrints = entry.updatePrints || [];
  const showEndOfDay = props.forceShow || isFinished;

  if (result.success) {
    const { state: newState, updates, bindings } = result.data;
    const diffState = Program_getDiffState(state, newState, units);
    const diffVars = Program_getDiffVars(entry, updates, bindings, settings);
    const prints = result.data.prints;

    if (
      (showEndOfDay && ObjectUtils_isNotEmpty(diffState)) ||
      (showEndOfDay && ObjectUtils_isNotEmpty(diffVars)) ||
      (showEndOfDay && prints.length > 0) ||
      updatePrints.length > 0
    ) {
      return (
        <View className="text-xs">
          {showEndOfDay && ObjectUtils_isNotEmpty(diffVars) && (
            <View className={props.entry.isSuppressed ? "line-through" : ""}>
              <Text className="font-bold text-xs">Exercise Changes</Text>
              {ObjectUtils_keys(diffVars).map((key) => (
                <Text key={key} className="text-xs">
                  <Text className="italic">{key}</Text>: <Text className="font-bold">{diffVars[key]}</Text>
                </Text>
              ))}
            </View>
          )}
          {showEndOfDay && ObjectUtils_isNotEmpty(diffState) && (
            <View className={props.entry.isSuppressed ? "line-through" : ""}>
              <Text className="font-bold text-xs">State Variables changes</Text>
              {ObjectUtils_keys(diffState).map((key) => (
                <Text key={key} className="text-xs">
                  <Text className="italic">{key}</Text>: <Text className="font-bold">{diffState[key]}</Text>
                </Text>
              ))}
            </View>
          )}
          {showEndOfDay && prints.length > 0 && (
            <View>
              <Text className="font-bold text-xs">Progress Prints</Text>
              {prints.map((print, i) => (
                <Text key={i} className="text-xs">
                  {print.map((p, j) => `${j > 0 ? ", " : ""}${Weight_print(p)}`).join("")}
                </Text>
              ))}
            </View>
          )}
          {updatePrints.length > 0 && (
            <View>
              <Text className="font-bold text-xs">Update Prints</Text>
              {updatePrints.map((print, i) => (
                <Text key={i} className="text-xs">
                  {print.map((p: IWeight | IPercentage | number, j: number) => `${j > 0 ? ", " : ""}${Weight_print(p)}`).join("")}
                </Text>
              ))}
            </View>
          )}
          {props.onSuppressProgress && (
            <Pressable onPress={() => props.onSuppressProgress!(!props.entry.isSuppressed)}>
              <Text className="text-xs font-bold text-text-link underline">
                {props.entry.isSuppressed ? "Enable" : "Suppress"}
              </Text>
            </Pressable>
          )}
        </View>
      );
    }
  }
  return null;
}
