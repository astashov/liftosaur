import { lb } from "lens-shmens";
import React, { JSX } from "react";
import { useState } from "react";
import { GroupHeader } from "../../../components/groupHeader";
import { MenuItemEditable } from "../../../components/menuItemEditable";
import { ISettings } from "../../../types";
import { IProgramDetailsDispatch, IProgramDetailsState } from "./types";

interface IProgramDetailsSettingsProps {
  settings: ISettings;
  dispatch: IProgramDetailsDispatch;
}

export function ProgramDetailsSettings(props: IProgramDetailsSettingsProps): JSX.Element {
  const { units } = props.settings;
  const [areSettingsShown, setAreSettingsShown] = useState(false);

  return (
    <div>
      <div>
        <button
          className="text-sm italic text-blue-700 underline program-details-settings-button"
          onClick={() => setAreSettingsShown(!areSettingsShown)}
        >
          {areSettingsShown ? "Hide Settings" : "Show Settings"}
        </button>
      </div>
      {areSettingsShown && (
        <div className="flex pb-4 program-details-settings">
          <div className="flex-1">
            <GroupHeader name="Units" />
            <MenuItemEditable
              name="Weight"
              type="select"
              value={units}
              values={[
                ["lb", "lb"],
                ["kg", "kg"],
              ]}
              onChange={(newValue?: string) => {
                if (newValue) {
                  props.dispatch(
                    lb<IProgramDetailsState>()
                      .p("settings")
                      .p("units")
                      .record(newValue as "kg" | "lb")
                  );
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
