import { JSX, h } from "preact";
import { IProgram, Program } from "../../models/program";
import { IHistoryRecord } from "../../models/history";
import { ISettings } from "../../models/settings";
import { ObjectUtils } from "../../utils/object";

interface IProps {
  progress: IHistoryRecord;
  program: IProgram;
  settings: ISettings;
}

export function FinishScriptStateChangesView(props: IProps): JSX.Element {
  // TODO: Extract into function, so that errors show properly in multiline editor
  const { progress, program, settings } = props;
  const result = Program.runFinishDayScript(program, progress, settings);

  if (result.success) {
    const newState = result.data;
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
  } else {
    return (
      <ul className="px-6 py-4 text-sm">
        <li></li>
      </ul>
    );
  }
}
