import { createContext, JSX, ReactNode, useContext } from "react";
import { useAppState } from "../../navigation/StateContext";
import { useTimedMemo } from "../../utils/useTimedMemo";
import { DateUtils_formatYYYYMMDD } from "../../utils/date";
import { ILiftographSeriesEval, LiftographSeriesEval_create } from "../../liftograph/liftographSeriesEval";

const DashboardEvaluationContext = createContext<ILiftographSeriesEval | undefined>(undefined);

export function DashboardEvaluationProvider(props: { children: ReactNode }): JSX.Element {
  const { history, stats, settings } = useAppState().state.storage;
  const today = DateUtils_formatYYYYMMDD(Date.now());
  const evaluation = useTimedMemo(
    "dashboard.evaluation",
    () => LiftographSeriesEval_create({ history, stats, settings, today: Date.now() }),
    [history, stats, settings, today]
  );
  return <DashboardEvaluationContext.Provider value={evaluation}>{props.children}</DashboardEvaluationContext.Provider>;
}

export function useDashboardEvaluation(): ILiftographSeriesEval {
  const evaluation = useContext(DashboardEvaluationContext);
  if (evaluation == null) {
    throw new Error("DashboardEvaluationProvider is missing");
  }
  return evaluation;
}
