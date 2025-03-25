import { h, JSX } from "preact";
import { ProgramPreviewPlayground } from "./preview/programPreviewPlayground";
import { IProgram, ISettings, IUnit } from "../types";
import { IconEditSquare } from "./icons/iconEditSquare";
import { MenuItemEditable, MenuItemValue } from "./menuItemEditable";
import { useState } from "preact/hooks";

interface IProgramPreviewOrPlaygroundProps {
  program: IProgram;
  settings: ISettings;
  isMobile: boolean;
  hasNavbar?: boolean;
  onChangeUnit?: (unit: IUnit) => void;
}

export function ProgramPreviewOrPlayground(props: IProgramPreviewOrPlaygroundProps): JSX.Element {
  const [isPlayground, setIsPlayground] = useState<boolean>(false);
  return (
    <div>
      <div className="mx-4 mt-2">
        {props.isMobile ? (
          <MenuItemEditable
            type="boolean"
            name="Enable Playground"
            value={isPlayground ? "true" : "false"}
            onChange={(newValue) => setIsPlayground(newValue === "true")}
          />
        ) : (
          <div>
            <label className="inline-block">
              <span className="mr-2">Enable Playground:</span>
              <MenuItemValue
                type="desktop-select"
                setPatternError={() => undefined}
                name="Enable Playground"
                value={isPlayground ? "true" : "false"}
                values={[
                  ["true", "Yes"],
                  ["false", "No"],
                ]}
                onChange={(newValue) => setIsPlayground(newValue === "true")}
              />
            </label>
            <label className="inline-block ml-4">
              <span className="mr-2">Units:</span>
              <MenuItemValue
                name="Units"
                setPatternError={() => undefined}
                type="desktop-select"
                value={props.settings.units}
                values={[
                  ["lb", "lb"],
                  ["kg", "kg"],
                ]}
                onChange={(newValue) => {
                  if (props.onChangeUnit) {
                    props.onChangeUnit(newValue as IUnit);
                  }
                }}
              />
            </label>
          </div>
        )}
      </div>
      {isPlayground && (
        <div className="py-2 mx-4 text-sm">
          Playground mode emulates the workout, you can complete sets by tapping on squares below, and see how the
          program logic works. Some programs may do nothing, some may update the weights, some may switch to different
          set schemes. You can adjust your weights and other variables by clicking on the{" "}
          <IconEditSquare className="inline-block" /> icon.
        </div>
      )}
      <ProgramPreviewPlayground
        hasNavbar={props.hasNavbar}
        key={isPlayground ? "playground" : "preview"}
        isPlayground={isPlayground}
        program={props.program}
        settings={props.settings}
      />
    </div>
  );
}
