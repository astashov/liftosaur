import { JSX, memo } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IEvaluatedProgram, Program_computeProgressStateChanges } from "../models/program";
import { ObjectUtils_isNotEmpty, ObjectUtils_keys } from "../utils/object";
import { Weight_print } from "../models/weight";
import { StringUtils_dashcase } from "../utils/string";
import { Reps_isFinished } from "../models/set";
import { IHistoryEntry, ISettings, IProgramState, IDayData, IPercentage, IWeight, IStats } from "../types";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { LinkButton } from "./linkButton";

// Not a "line-through" className - RN doesn't inherit text decoration from a View into its Text
// children the way CSS does, so it has to sit on every Text node itself.
const strikeThrough = { textDecorationLine: "line-through" } as const;

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
  const { entry, settings, dayData } = props;
  const changes = Program_computeProgressStateChanges(
    entry,
    dayData,
    settings,
    props.programExercise,
    props.program,
    props.stats,
    props.userPromptedStateVars
  );
  if (!changes) {
    return null;
  }
  const showEndOfDay = props.forceShow || Reps_isFinished(entry.sets);

  return (
    <ProgressStateChangesView
      diffState={showEndOfDay ? changes.diffState : undefined}
      diffVars={showEndOfDay ? changes.diffVars : undefined}
      prints={showEndOfDay ? changes.prints : undefined}
      updatePrints={entry.updatePrints}
      isSuppressed={entry.isSuppressed}
      onSuppressProgress={props.onSuppressProgress}
    />
  );
}

export const ProgressStateChanges = memo(ProgressStateChangesInner);

interface IViewProps {
  diffState?: Record<string, string | undefined>;
  diffVars?: Record<string, string | undefined>;
  prints?: (number | IWeight | IPercentage)[][];
  updatePrints?: (number | IWeight | IPercentage)[][];
  isSuppressed?: boolean;
  onSuppressProgress?: (isSuppressed: boolean) => void;
}

export function ProgressStateChangesView(props: IViewProps): JSX.Element | null {
  const diffState = props.diffState ?? {};
  const diffVars = props.diffVars ?? {};
  const prints = props.prints ?? [];
  const updatePrints = props.updatePrints ?? [];
  const hasDiffState = ObjectUtils_isNotEmpty(diffState);
  const hasDiffVars = ObjectUtils_isNotEmpty(diffVars);
  const onSuppressProgress = props.onSuppressProgress;

  if (!hasDiffVars && !hasDiffState && prints.length === 0 && updatePrints.length === 0) {
    return null;
  }

  return (
    <View
      data-help-id="progress-state-changes"
      data-help="This shows how state variables of the exercise are going to change after finishing this workout day. It usually indicates progression or deload, so next time you'd do more/less reps, or lift more/less weight."
    >
      <View>
        {hasDiffVars && <ExerciseChanges diffVars={diffVars} isSuppressed={props.isSuppressed} />}
        {hasDiffState && <StateVariablesChanges diffState={diffState} isSuppressed={props.isSuppressed} />}
        {prints.length > 0 && <Prints title="Progress Prints" prints={prints} />}
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
              onSuppressProgress(!props.isSuppressed);
            }}
          >
            {props.isSuppressed ? "Enable" : "Suppress"}
          </LinkButton>
        </View>
      )}
    </View>
  );
}

function ExerciseChanges({
  diffVars,
  isSuppressed,
}: {
  diffVars: Record<string, string | undefined>;
  isSuppressed?: boolean;
}): JSX.Element | null {
  if (ObjectUtils_isNotEmpty(diffVars)) {
    const strike = isSuppressed ? strikeThrough : undefined;
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
              <Text style={strike} className="text-xs">
                <Text style={strike} className="text-xs italic">
                  {key}
                </Text>
                :{" "}
                <Text
                  style={strike}
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

function StateVariablesChanges({
  diffState,
  isSuppressed,
}: {
  diffState: Record<string, string | undefined>;
  isSuppressed?: boolean;
}): JSX.Element | null {
  if (ObjectUtils_isNotEmpty(diffState)) {
    const strike = isSuppressed ? strikeThrough : undefined;
    return (
      <View>
        <Text style={strike} className="text-xs font-bold">
          State Variables changes
        </Text>
        <View data-testid="state-changes" testID="state-changes">
          {ObjectUtils_keys(diffState).map((key) => (
            <View
              key={key}
              data-testid={`state-changes-key-${StringUtils_dashcase(key)}`}
              testID={`state-changes-key-${StringUtils_dashcase(key)}`}
            >
              <Text style={strike} className="text-xs">
                <Text style={strike} className="text-xs italic">
                  {key}
                </Text>
                :{" "}
                <Text
                  style={strike}
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
