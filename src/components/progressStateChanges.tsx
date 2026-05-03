import { JSX, memo } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import {
  IEvaluatedProgram,
  Program_getDiffState,
  Program_getDiffVars,
  Program_runExerciseFinishDayScript,
} from "../models/program";
import { ObjectUtils_isNotEmpty, ObjectUtils_keys } from "../utils/object";
import { Weight_print } from "../models/weight";
import { StringUtils_dashcase } from "../utils/string";
import { Reps_isFinished } from "../models/set";
import { IHistoryEntry, ISettings, IProgramState, IDayData, IPercentage, IWeight, IStats } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgramExercise_getState } from "../pages/planner/models/plannerProgramExercise";
import { LinkButton } from "./linkButton";

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

function ProgressStateChangesInner(props: IProps): JSX.Element | null {
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
  const onSuppressProgress = props.onSuppressProgress;

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
        <View
          data-help-id="progress-state-changes"
          data-help="This shows how state variables of the exercise are going to change after finishing this workout day. It usually indicates progression or deload, so next time you'd do more/less reps, or lift more/less weight."
        >
          <View>
            {showEndOfDay && ObjectUtils_isNotEmpty(diffVars) && (
              <View className={props.entry.isSuppressed ? "line-through" : ""}>
                <ExerciseChanges diffVars={diffVars} />
              </View>
            )}
            {showEndOfDay && ObjectUtils_isNotEmpty(diffState) && (
              <View className={props.entry.isSuppressed ? "line-through" : ""}>
                <StateVariablesChanges diffState={diffState} />
              </View>
            )}
            {showEndOfDay && prints.length > 0 && <Prints title="Progress Prints" prints={prints} />}
            {updatePrints.length > 0 && <Prints title="Update Prints" prints={updatePrints} />}
          </View>
          {onSuppressProgress && (
            <View>
              <LinkButton
                name="supress-progress"
                className="text-xs"
                data-testid="suppress-progress"
                testID="suppress-progress"
                onClick={() => {
                  onSuppressProgress(!props.entry.isSuppressed);
                }}
              >
                {props.entry.isSuppressed ? "Enable" : "Suppress"}
              </LinkButton>
            </View>
          )}
        </View>
      );
    }
  }
  return null;
}

export const ProgressStateChanges = memo(ProgressStateChangesInner);

function ExerciseChanges({ diffVars }: { diffVars: Record<string, string | undefined> }): JSX.Element | null {
  if (ObjectUtils_isNotEmpty(diffVars)) {
    return (
      <View>
        <Text className="text-xs font-bold">Exercise Changes</Text>
        <View data-testid="variable-changes" testID="variable-changes">
          {ObjectUtils_keys(diffVars).map((key) => (
            <View
              key={key}
              data-testid={`variable-changes-key-${StringUtils_dashcase(key)}`}
              testID={`variable-changes-key-${StringUtils_dashcase(key)}`}
            >
              <Text className="text-xs">
                <Text className="text-xs italic">{key}</Text>:{" "}
                <Text
                  className="text-xs font-bold"
                  data-testid={`variable-changes-value-${StringUtils_dashcase(key)}`}
                  testID={`variable-changes-value-${StringUtils_dashcase(key)}`}
                >
                  {diffVars[key]}
                </Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return null;
}

function StateVariablesChanges({ diffState }: { diffState: Record<string, string | undefined> }): JSX.Element | null {
  if (ObjectUtils_isNotEmpty(diffState)) {
    return (
      <View>
        <Text className="text-xs font-bold">State Variables changes</Text>
        <View data-testid="state-changes" testID="state-changes">
          {ObjectUtils_keys(diffState).map((key) => (
            <View
              key={key}
              data-testid={`state-changes-key-${StringUtils_dashcase(key)}`}
              testID={`state-changes-key-${StringUtils_dashcase(key)}`}
            >
              <Text className="text-xs">
                <Text className="text-xs italic">{key}</Text>:{" "}
                <Text
                  className="text-xs font-bold"
                  data-testid={`state-changes-value-${StringUtils_dashcase(key)}`}
                  testID={`state-changes-value-${StringUtils_dashcase(key)}`}
                >
                  {diffState[key]}
                </Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return null;
}

function Prints({
  title,
  prints,
}: {
  title: string;
  prints: (IWeight | IPercentage | number)[][];
}): JSX.Element | null {
  if (prints.length > 0) {
    return (
      <View>
        <Text className="text-xs font-bold">{title}</Text>
        <View>
          {prints.map((print) => (
            <View key={JSON.stringify(print)}>
              <Text className="text-xs">
                {print.map((p, i) => (
                  <Text key={i}>
                    {i > 0 ? ", " : ""}
                    {Weight_print(p)}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return null;
}
