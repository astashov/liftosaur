import { JSX, h } from "preact";
import { memo } from "preact/compat";
import { IDayData, ISet, ISettings } from "../../../types";
import { HistoryRecordSetsView } from "../../../components/historyRecordSets";
import { IPlannerProgramExerciseEvaluatedSet, IPlannerProgramExerciseUsed } from "../../planner/models/types";
import { ProgramSet } from "../../../models/programSet";

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
    const weight = ProgramSet.getEvaluatedWeight(set, props.programExercise.exerciseType, props.settings);
    return {
      reps: set.maxrep,
      minReps,
      weight,
      originalWeight: set.weight,
      isAmrap: set.isAmrap,
    };
  });
  return (
    <div>
      <HistoryRecordSetsView sets={sets} isNext={true} settings={props.settings} />
    </div>
  );
});
