import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { IDeload, IProgression, Progression } from "../../models/progression";
import { ISettings, IUnit } from "../../types";
import { ReactUtils } from "../../utils/react";
import { SendMessage } from "../../utils/sendMessage";
import { IconArrowUpCircle } from "../icons/iconArrowUpCircle";
import { selectInputOnFocus } from "../input";
import { MenuItemWrapper } from "../menuItem";
import { MenuItemEditable } from "../menuItemEditable";

interface IEditProgramExerciseSimpleProgressionProps {
  finishDayExpr: string;
  settings: ISettings;
  onUpdate: (progression?: IProgression, deload?: IDeload) => void;
}

export function EditProgramExerciseSimpleProgression(props: IEditProgramExerciseSimpleProgressionProps): JSX.Element {
  const { settings, finishDayExpr } = props;
  const inputClassName = `inline-block w-10 px-1 py-1 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring`;

  const [progression, setProgression] = ReactUtils.useStateWithCallback<IProgression | undefined>(
    () => Progression.getProgression(finishDayExpr),
    () => {
      props.onUpdate(progression, deload);
    }
  );

  const [deload, setDeload] = ReactUtils.useStateWithCallback<IDeload | undefined>(
    () => Progression.getDeload(finishDayExpr),
    () => {
      props.onUpdate(progression, deload);
    }
  );

  const progressionIncrementRef = useRef<HTMLInputElement>();
  const progressionUnitRef = useRef<HTMLSelectElement>();
  const progressionAttemptsRef = useRef<HTMLInputElement>();
  const deloadDecrementsRef = useRef<HTMLInputElement>();
  const deloadUnitRef = useRef<HTMLSelectElement>();
  const deloadFailuresRef = useRef<HTMLInputElement>();

  return (
    <section>
      <MenuItemEditable
        type="boolean"
        prefix={<IconArrowUpCircle className="mr-2" color="#38A169" />}
        isNameHtml={true}
        name="Enable&nbsp;Progression"
        value={progression != null ? "true" : "false"}
        onChange={(v) => {
          const newProgression = progression == null ? { increment: 5, unit: settings.units, attempts: 1 } : undefined;
          setProgression(newProgression);
        }}
      />
      {progression != null && (
        <MenuItemWrapper name="progression">
          <div className="py-2">
            <span>Increase by </span>
            <input
              min="0"
              max="100"
              ref={progressionIncrementRef}
              className={inputClassName}
              onFocus={selectInputOnFocus}
              type={SendMessage.isIos() ? "number" : "tel"}
              value={progression.increment}
              onBlur={() => {
                let value: number | undefined = parseFloat(progressionIncrementRef.current.value);
                value = isNaN(value) ? undefined : Math.max(0, Math.min(100, value));
                if (value != null) {
                  setProgression({ ...progression, increment: value });
                }
              }}
            />
            <select
              ref={progressionUnitRef}
              name="units"
              onChange={() => {
                const unit = progressionUnitRef.current.value as IUnit | "%";
                if (unit != null) {
                  setProgression({ ...progression, unit });
                }
              }}
            >
              <option selected={progression.unit === settings.units} value={settings.units}>
                {settings.units}
              </option>
              <option selected={progression.unit === "%"} value="%">
                %
              </option>
            </select>
            <span> after </span>
            <input
              ref={progressionAttemptsRef}
              className={inputClassName}
              onFocus={selectInputOnFocus}
              type="tel"
              value={progression.attempts}
              onBlur={() => {
                let value: number | undefined = parseInt(progressionAttemptsRef.current.value, 10);
                value = isNaN(value) ? undefined : Math.max(0, Math.min(20, value));
                if (value != null) {
                  setProgression({ ...progression, attempts: value });
                }
              }}
            />
            <span> successful attempts.</span>
          </div>
        </MenuItemWrapper>
      )}
      <MenuItemEditable
        type="boolean"
        prefix={<IconArrowUpCircle className="mr-2" color="#E53E3E" style={{ transform: "rotate(180deg)" }} />}
        isNameHtml={true}
        name="Enable Deload"
        value={deload != null ? "true" : "false"}
        onChange={(v) => {
          const newDeload = deload == null ? { decrement: 5, unit: settings.units, attempts: 1 } : undefined;
          setDeload(newDeload);
          props.onUpdate(progression, newDeload);
        }}
      />
      {deload != null && (
        <MenuItemWrapper name="deload">
          <div className="py-2">
            <span>Decrease by </span>
            <input
              ref={deloadDecrementsRef}
              className={inputClassName}
              type={SendMessage.isIos() ? "number" : "tel"}
              onFocus={selectInputOnFocus}
              value={deload.decrement}
              onBlur={() => {
                let value: number | undefined = parseFloat(deloadDecrementsRef.current.value);
                value = isNaN(value) ? undefined : Math.max(0, Math.min(100, value));
                if (value != null) {
                  setDeload({ ...deload, decrement: value });
                }
              }}
            />
            <select
              ref={deloadUnitRef}
              name="units"
              onChange={() => {
                const unit = deloadUnitRef.current.value as IUnit | "%";
                if (unit != null) {
                  setDeload({ ...deload, unit });
                }
              }}
            >
              <option selected={deload.unit === settings.units} value={settings.units}>
                {settings.units}
              </option>
              <option selected={deload.unit === "%"} value="%">
                %
              </option>
            </select>
            <span> after </span>
            <input
              ref={deloadFailuresRef}
              className={inputClassName}
              type="tel"
              value={deload.attempts}
              onFocus={selectInputOnFocus}
              onBlur={() => {
                let value: number | undefined = parseInt(deloadFailuresRef.current.value, 10);
                value = isNaN(value) ? undefined : Math.max(0, Math.min(20, value));
                if (value != null) {
                  setDeload({ ...deload, attempts: value });
                }
              }}
            />
            <span> failed attempts.</span>
          </div>
        </MenuItemWrapper>
      )}
    </section>
  );
}
