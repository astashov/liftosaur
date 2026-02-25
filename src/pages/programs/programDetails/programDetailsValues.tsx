import { JSX, h } from "preact";
import { memo } from "preact/compat";
import { IDayData, ISet, ISettings } from "../../../types";
import { HistoryRecordSetsView } from "../../../components/historyRecordSets";
import { IPlannerProgramExerciseEvaluatedSet, IPlannerProgramExerciseWithType } from "../../planner/models/types";
import { ProgramSet_getEvaluatedWeight } from "../../../models/programSet";
import { Exercise_getIsUnilateral } from "../../../models/exercise";
import { UidFactory_generateUid } from "../../../utils/generator";

interface IRepsWeightsProps {
  sets: IPlannerProgramExerciseEvaluatedSet[];
  programExercise: IPlannerProgramExerciseWithType;
  dayData: IDayData;
  settings: ISettings;
  shouldShowAllFormulas: boolean;
  forceShowFormula?: boolean;
}

export const RepsAndWeight = memo((props: IRepsWeightsProps): JSX.Element => {
  const sets: ISet[] = props.sets.map<ISet>((set, i) => {
    const minReps = set.minrep != null && set.minrep !== set.maxrep ? set.minrep : undefined;
    const weight = ProgramSet_getEvaluatedWeight(set, props.programExercise.exerciseType, props.settings);
    const isUnilateral = Exercise_getIsUnilateral(props.programExercise.exerciseType, props.settings);
    return {
      vtype: "set",
      index: i,
      id: UidFactory_generateUid(6),
      reps: set.maxrep,
      minReps,
      weight,
      originalWeight: set.weight,
      isUnilateral,
      isAmrap: set.isAmrap,
    };
  });
  return (
    <div>
      <HistoryRecordSetsView sets={sets} isNext={true} settings={props.settings} />
    </div>
  );
});
