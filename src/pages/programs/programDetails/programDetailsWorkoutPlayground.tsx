import { h, JSX } from "preact";
import { memo, useState } from "preact/compat";
import { IProgram, ISettings, IUnit } from "../../../types";
import { MenuItemValue } from "../../../components/menuItemEditable";
import { ProgramPreviewPlayground } from "../../../components/preview/programPreviewPlayground";

interface IPlaygroundProps {
  program: IProgram;
  settings: ISettings;
}

export const ProgramDetailsWorkoutPlayground = memo(
  (props: IPlaygroundProps): JSX.Element => {
    const [units, setUnits] = useState<IUnit>("lb");
    const settings = { ...props.settings, units };

    return (
      <div>
        <div className="mb-2">
          <label>
            <span className="mx-2 font-bold">Units:</span>
            <MenuItemValue
              name="Unit"
              setPatternError={() => undefined}
              type="desktop-select"
              value={units}
              values={[
                ["lb", "lb"],
                ["kg", "kg"],
              ]}
              onChange={(newValue) => {
                if (newValue) {
                  setUnits(newValue as IUnit);
                }
              }}
            />
          </label>
          <div className="flex-1" />
        </div>
        <ProgramPreviewPlayground key={units} program={props.program} settings={settings} isPlayground={true} />
      </div>
    );
  }
);
