import { JSX, h, Fragment } from "preact";
import { memo, useState } from "preact/compat";
import { ProgramExercise } from "../../../models/programExercise";
import { Progress } from "../../../models/progress";
import { Weight } from "../../../models/weight";
import { IDayData, IProgramExercise, IProgramSet, ISet, ISettings, IWeight } from "../../../types";
import { HistoryRecordProgramSetsView, HistoryRecordSetsView } from "../../../components/historyRecordSets";

function getRepsValues(props: IRepsWeightsProps): number[] {
  return props.sets.map((set) => {
    return Progress.executeEntryScript(
      set.repsExpr,
      props.dayData,
      ProgramExercise.getState(props.programExercise, props.allProgramExercises),
      { equipment: props.programExercise.exerciseType.equipment },
      props.settings,
      "reps"
    );
  }, []);
}

function getWeightsValues(props: IRepsWeightsProps): IWeight[] {
  return props.sets.map((set) => {
    const value = Progress.executeEntryScript(
      set.weightExpr,
      props.dayData,
      ProgramExercise.getState(props.programExercise, props.allProgramExercises),
      { equipment: props.programExercise.exerciseType.equipment },
      props.settings,
      "weight"
    );
    return Weight.roundConvertTo(value, props.settings, props.programExercise.exerciseType.equipment);
  }, []);
}

function getWeightsScripts(props: { sets: IProgramSet[] }): string[] {
  return props.sets.map((set) => set.weightExpr);
}

function getRepsScripts(props: { sets: IProgramSet[] }): string[] {
  return props.sets.map((set) => set.repsExpr);
}

interface IRepsWeightsProps {
  sets: IProgramSet[];
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  dayData: IDayData;
  settings: ISettings;
  shouldShowAllFormulas: boolean;
  forceShowFormula?: boolean;
}

export const RepsAndWeight = memo(
  (props: IRepsWeightsProps): JSX.Element => {
    const [isDisplayingFormula, setIsDisplayingFormula] = useState(props.shouldShowAllFormulas);
    const forceShowFormula = props.forceShowFormula;
    const repsValues = getRepsValues(props);
    const weightValues = getWeightsValues(props);
    const repsScripts = getRepsScripts(props);
    const weightsScripts = getWeightsScripts(props);
    const sets: ISet[] = repsValues.map<ISet>((reps, i) => ({
      reps: reps,
      weight: weightValues[i],
      isAmrap: !!props.sets[i]?.isAmrap,
    }));
    const areEqual =
      repsScripts.length === repsValues.length &&
      repsScripts.every((v, i) => v === repsScripts[i]) &&
      weightValues.length === weightsScripts.length &&
      weightsScripts.every((v, i) => v === `${weightValues[i].value}`);
    return (
      <div>
        {(areEqual || (forceShowFormula == null ? !isDisplayingFormula : !forceShowFormula)) && (
          <>
            <HistoryRecordSetsView sets={sets} isNext={true} settings={props.settings} />
            {!areEqual && forceShowFormula == null && (
              <div className="whitespace-no-wrap">
                <button
                  className="text-sm underline text-bluev2"
                  onClick={() => setIsDisplayingFormula(!isDisplayingFormula)}
                >
                  Show Formula
                </button>
              </div>
            )}
          </>
        )}
        {!areEqual && (forceShowFormula == null ? isDisplayingFormula : forceShowFormula) && (
          <>
            <HistoryRecordProgramSetsView sets={props.sets} />
            {forceShowFormula == null && (
              <div className="whitespace-no-wrap">
                <button
                  onClick={() => setIsDisplayingFormula(!isDisplayingFormula)}
                  className="text-sm text-blue-700 underline"
                >
                  Show Values
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);
