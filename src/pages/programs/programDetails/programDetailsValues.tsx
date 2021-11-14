import { JSX, h, Fragment } from "preact";
import { memo, useState } from "preact/compat";
import { Progress } from "../../../models/progress";
import { Weight } from "../../../models/weight";
import { IProgramExercise, IProgramSet, ISettings } from "../../../types";

function getRepsValues(props: IRepsWeightsProps): string[] {
  return props.sets.map((set) => {
    const value = Progress.executeEntryScript(
      set.repsExpr,
      props.dayIndex,
      props.programExercise.state,
      { equipment: props.programExercise.exerciseType.equipment },
      props.settings,
      "reps"
    );
    return `${value}`;
  }, []);
}

function getWeightsValues(props: IRepsWeightsProps): string[] {
  return props.sets.map((set) => {
    const value = Progress.executeEntryScript(
      set.weightExpr,
      props.dayIndex,
      props.programExercise.state,
      { equipment: props.programExercise.exerciseType.equipment },
      props.settings,
      "weight"
    );
    const result = Weight.display(
      Weight.roundConvertTo(value, props.settings, props.programExercise.exerciseType.equipment)
    );
    return result;
  }, []);
}

function getWeightsScripts(props: { sets: IProgramSet[] }): string[] {
  return props.sets.map((set) => set.weightExpr);
}

function getRepsScripts(props: { sets: IProgramSet[] }): string[] {
  return props.sets.map((set) => set.repsExpr);
}

function areValuesAndScriptsEqual(values: string[], scripts: string[]): boolean {
  return values.length === scripts.length && values.every((v, i) => v === scripts[i]);
}

interface IRepsWeightsProps {
  sets: IProgramSet[];
  programExercise: IProgramExercise;
  dayIndex: number;
  settings: ISettings;
  shouldShowAllFormulas: boolean;
}

export const Reps = memo(
  (props: IRepsWeightsProps): JSX.Element => {
    const values = getRepsValues(props);
    const scripts = getRepsScripts({ sets: props.sets });
    return <ValuesAndFormula values={values} scripts={scripts} shouldShowAllFormulas={props.shouldShowAllFormulas} />;
  }
);

export const Weights = memo(
  (props: IRepsWeightsProps): JSX.Element => {
    const values = getWeightsValues(props);
    const scripts = getWeightsScripts({ sets: props.sets });
    return <ValuesAndFormula values={values} scripts={scripts} shouldShowAllFormulas={props.shouldShowAllFormulas} />;
  }
);

interface IValuesAndFormulaProps {
  values: string[];
  scripts: string[];
  shouldShowAllFormulas: boolean;
}

function ValuesAndFormula(props: IValuesAndFormulaProps): JSX.Element {
  const { values, scripts } = props;
  const areEqual = areValuesAndScriptsEqual(values, scripts);
  const [isDisplayingFormula, setIsDisplayingFormula] = useState(props.shouldShowAllFormulas);
  return (
    <div>
      {(areEqual || !isDisplayingFormula) && (
        <>
          <GroupedValues values={values} />{" "}
          {!areEqual && (
            <span className="whitespace-no-wrap">
              (
              <button
                className="text-sm text-blue-700 underline"
                onClick={() => setIsDisplayingFormula(!isDisplayingFormula)}
              >
                Show Formula
              </button>
              )
            </span>
          )}
        </>
      )}
      {!areEqual && isDisplayingFormula && (
        <>
          <GroupedValues values={scripts} />{" "}
          <span className="whitespace-no-wrap">
            (
            <button
              onClick={() => setIsDisplayingFormula(!isDisplayingFormula)}
              className="text-sm text-blue-700 underline"
            >
              Show Values
            </button>
            )
          </span>
        </>
      )}
    </div>
  );
}

const GroupedValues = memo(
  (props: { values: string[] }): JSX.Element => {
    const groups = props.values.reduce<[string, number][]>((acc, value) => {
      const last = acc[acc.length - 1];
      if (last == null) {
        acc.push([value, 1]);
      } else {
        const [lastValue] = last;
        if (lastValue === value) {
          acc[acc.length - 1][1] += 1;
        } else {
          acc.push([value, 1]);
        }
      }
      return acc;
    }, []);
    const jsxes = groups.map((group) => {
      const [reps, sets] = group;
      return (
        <span>
          {sets > 1 && (
            <Fragment>
              <span>{sets}</span>
              <span> x </span>
            </Fragment>
          )}
          <span>{reps}</span>
        </span>
      );
    });
    return (
      <span>
        {jsxes.map((el, i) => (
          <span>
            {i !== 0 ? <span> / </span> : <Fragment></Fragment>}
            {el}
          </span>
        ))}
      </span>
    );
  }
);
