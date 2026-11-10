import { JSX, memo, useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Select } from "./primitives/select";
import { equipmentName, Exercise_get } from "../models/exercise";
import { IExerciseType, ISettings, IExerciseSelectedType, IHistoryRecord } from "../types";
import { IDispatch } from "../ducks/types";
import { Thunk_editHistoryRecord } from "../ducks/thunks";
import { LiftographGraphs_exerciseDocument, LiftographGraphs_exerciseSource } from "../liftograph/liftographGraphs";
import { ILiftographSeriesEval } from "../liftograph/liftographSeriesEval";
import { DashboardTextGraph } from "./dashboard/dashboardTextGraph";

interface IGraphExerciseProps {
  id: string;
  evaluation: ILiftographSeriesEval;
  exercise: IExerciseType;
  settings: ISettings;
  title?: string;
  subtitle?: string;
  initialType?: IExerciseSelectedType;
  dispatch?: IDispatch;
  isInteractive?: boolean;
  onInteract?: (reason: "manipulate" | "type") => void;
}

const TYPE_OPTIONS: { value: IExerciseSelectedType; label: string }[] = [
  { value: "weight", label: "Max Weight" },
  { value: "volume", label: "Volume" },
];

function GraphExerciseInner(props: IGraphExerciseProps): JSX.Element {
  const { exercise, settings, dispatch, onInteract } = props;
  const [selectedType, setSelectedType] = useState<IExerciseSelectedType>(props.initialType || "weight");
  const fullExercise = Exercise_get(exercise, settings.exercises);
  const text = useMemo(
    () => LiftographGraphs_exerciseDocument(LiftographGraphs_exerciseSource(exercise, settings), selectedType, true),
    [exercise, settings.exercises, selectedType]
  );
  const onChartInteract = useCallback(() => onInteract?.("manipulate"), [onInteract]);
  const onOpenRecord = useCallback((record: IHistoryRecord) => dispatch?.(Thunk_editHistoryRecord(record)), [dispatch]);

  return (
    <View testID="graph" data-testid="graph">
      <View className="flex-row items-center mb-1">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-left leading-scaled-6 u-title">
            {props.title || fullExercise.name}
          </Text>
          <Text className="text-xs text-left leading-scaled-4 text-text-secondary">
            {props.subtitle || equipmentName(exercise.equipment)}
          </Text>
        </View>
        <Select
          value={selectedType}
          onChange={(v) => {
            const option = TYPE_OPTIONS.find((o) => o.value === v);
            if (option != null) {
              onInteract?.("type");
              setSelectedType(option.value);
            }
          }}
          options={TYPE_OPTIONS}
          className="p-2 text-xs text-right bg-background-default"
        />
      </View>
      <DashboardTextGraph
        id={props.id}
        text={text}
        evaluation={props.evaluation}
        isInteractive={props.isInteractive}
        onInteract={onChartInteract}
        onOpenRecord={dispatch != null ? onOpenRecord : undefined}
      />
    </View>
  );
}

export const GraphExercise = memo(GraphExerciseInner);
