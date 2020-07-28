import { JSX, h } from "preact";
import { IProgram, IProgramInternalState, Program } from "../../models/program";
import { IHistoryRecord } from "../../models/history";
import { ISettings } from "../../models/settings";
import { Progress } from "../../models/progress";
import { ScriptRunner } from "../../parser";
import { ObjectUtils } from "../../utils/object";

interface IProps {
  progress: IHistoryRecord;
  program: IProgram;
  settings: ISettings;
}

export function FinishScriptStateChangesView(props: IProps): JSX.Element {
  const { progress, program, settings } = props;
  const bindings = Progress.createScriptBindings(progress);
  const fns = Progress.createScriptFunctions(settings);
  const newInternalState: IProgramInternalState = {
    nextDay: Program.nextDay(program, program.internalState.nextDay),
  };
  const newState: Record<string, number> = { ...newInternalState, ...program.state };

  let error: string | undefined;

  try {
    new ScriptRunner(program.finishDayExpr, newState, bindings, fns).execute(false);
  } catch (e) {
    if (e instanceof SyntaxError) {
      error = e.message;
    } else {
      throw e;
    }
  }

  if (error) {
    return (
      <span className="text-sm">
        <span className="text-red-500">Error: </span>
        <span className="font-bold text-red-700">{error}</span>
      </span>
    );
  } else {
    const oldState = { ...program.internalState, ...program.state };
    const diffState = ObjectUtils.keys(oldState).reduce<Record<string, string | undefined>>((memo, key) => {
      const oldValue = oldState[key];
      const newValue = newState[key];
      if (oldValue !== newValue) {
        memo[key] = `${oldValue} -> ${newValue}`;
      }
      return memo;
    }, {});
    return (
      <ul className="px-6 py-4 text-sm">
        {ObjectUtils.keys(diffState).map((key) => (
          <li>
            {key}: <strong>{diffState[key]}</strong>
          </li>
        ))}
      </ul>
    );
  }
}
