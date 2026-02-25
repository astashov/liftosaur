import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { inputClassName } from "../../../components/input";
import { Weight_isPct, Weight_buildPct, Weight_build } from "../../../models/weight";
import { IPercentage, IProgramState, ISettings, IWeight } from "../../../types";
import { ObjectUtils_keys } from "../../../utils/object";
import { SendMessage_isIos } from "../../../utils/sendMessage";

interface IStateVarsProps {
  id: string;
  stateVars: IProgramState;
  settings: ISettings;
  onChange: (key: string, value: number | IWeight | IPercentage) => void;
}

export const StateVars = memo((props: IStateVarsProps): JSX.Element | null => {
  const { id, stateVars } = props;
  if (Object.keys(stateVars).length === 0) {
    return null;
  }
  const varEls = ObjectUtils_keys(stateVars).map((key) => {
    const variable = stateVars[key];
    const name = `${id}_${key}`;
    const val = typeof variable === "number" ? variable : variable.value;
    return (
      <li data-cy={`state-var-${key}`} className="flex items-center pb-2">
        <label className="pr-2 font-bold" for={name}>
          {key}
        </label>
        <input
          className={inputClassName}
          id={name}
          data-cy={`state-var-${key}-input`}
          name={name}
          type={SendMessage_isIos() ? "number" : "tel"}
          value={val}
          onInput={(e) => {
            const newValStr = (e.target as HTMLInputElement).value;
            const newVal = newValStr ? parseInt(newValStr, 10) : undefined;
            if (newVal != null && !isNaN(newVal)) {
              const newValue =
                typeof variable === "number"
                  ? newVal
                  : Weight_isPct(variable)
                    ? Weight_buildPct(newVal)
                    : Weight_build(newVal, variable.unit);
              props.onChange(key, newValue);
            }
          }}
        />
        <span className="pl-1">{typeof variable !== "number" ? variable.unit : ""}</span>
      </li>
    );
  });
  return (
    <div className="flex justify-start">
      <div style={{ width: "10em" }}>
        <h4 className="text-sm italic">State variables:</h4>
        <ul>{varEls}</ul>
      </div>
    </div>
  );
});
