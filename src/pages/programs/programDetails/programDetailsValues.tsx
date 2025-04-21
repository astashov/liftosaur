import { JSX, h } from "preact";
import { memo } from "preact/compat";
import { IDayData, ISet, ISettings } from "../../../types";
import { HistoryRecordSetsView } from "../../../components/historyRecordSets";
import { IPlannerProgramExerciseEvaluatedSet, IPlannerProgramExerciseUsed } from "../../planner/models/types";
import { Equipment } from "../../../models/equipment";
import { Weight } from "../../../models/weight";

interface IRepsWeightsProps {
  sets: IPlannerProgramExerciseEvaluatedSet[];
  programExercise: IPlannerProgramExerciseUsed;
  dayData: IDayData;
  settings: ISettings;
  shouldShowAllFormulas: boolean;
  forceShowFormula?: boolean;
}

export const RepsAndWeight = memo((props: IRepsWeightsProps): JSX.Element => {
  const sets: ISet[] = props.sets.map<ISet>((set, i) => {
    const minReps = set.minrep != null && set.minrep !== set.maxrep ? set.minrep : undefined;
    const unit = Equipment.getUnitOrDefaultForExerciseType(props.settings, props.programExercise.exerciseType);
    const originalWeight = set.weight
      ? Weight.evaluateWeight(set.weight, props.programExercise.exerciseType, props.settings)
      : undefined;
    const weight = originalWeight
      ? Weight.roundConvertTo(originalWeight, props.settings, unit, props.programExercise.exerciseType)
      : undefined;
    return {
      reps: set.maxrep,
      minReps,
      weight,
      originalWeight,
      isAmrap: set.isAmrap,
    };
  });
  return (
    <div>
      <HistoryRecordSetsView sets={sets} isNext={true} settings={props.settings} />
    </div>
  );
});
