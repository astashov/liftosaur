import { h, JSX } from "preact";
import { IProgramPreviewPlaygroundWeekSetup } from "./preview/programPreviewPlaygroundSetup";
import { ProgramPreviewPlayground } from "./preview/programPreviewPlayground";
import { IProgram, ISettings } from "../types";
import { IconEditSquare } from "./icons/iconEditSquare";
import { MenuItemEditable } from "./menuItemEditable";
import { useState } from "preact/hooks";

interface IProgramPreviewOrPlaygroundProps {
  program: IProgram;
  settings: ISettings;
  isMobile: boolean;
}

export function ProgramPreviewOrPlayground(props: IProgramPreviewOrPlaygroundProps): JSX.Element {
  const [isPlayground, setIsPlayground] = useState<boolean>(false);
  return (
    <div>
      <div className="mt-2">
        {props.isMobile ? (
          <MenuItemEditable
            type="boolean"
            name="Enable Playground"
            value={isPlayground ? "true" : "false"}
            onChange={(newValue) => setIsPlayground(newValue === "true")}
          />
        ) : (
          <MenuItemEditable
            type="desktop-select"
            name="Enable Playground"
            value={isPlayground ? "true" : "false"}
            values={[
              ["true", "Yes"],
              ["false", "No"],
            ]}
            onChange={(newValue) => setIsPlayground(newValue === "true")}
          />
        )}
      </div>
      {isPlayground && (
        <div className="py-2">
          Playground mode emulates the workout, you can complete sets by tapping on squares below, and see how the
          program logic works. Some programs may do nothing, some may update the weights, some may switch to different
          set schemes. You can adjust your weights and other variables by clicking on the{" "}
          <IconEditSquare className="inline-block" /> icon.
        </div>
      )}
      <ProgramPreviewPlayground
        key={isPlayground ? "playground" : "preview"}
        isPlayground={isPlayground}
        program={props.program}
        settings={props.settings}
        weekSetup={buildWeekSetup(props.program)}
      />
    </div>
  );
}

function buildWeekSetup(program: IProgram): IProgramPreviewPlaygroundWeekSetup[] {
  if (!program.isMultiweek) {
    const days = [];
    for (let day = 1; day <= program.days.length; day++) {
      days.push({ dayIndex: day, states: {} });
    }
    return [
      {
        name: "Week 1",
        days,
      },
    ];
  } else {
    const weekSetup: IProgramPreviewPlaygroundWeekSetup[] = [];
    let dayIndex = 1;
    for (const week of program.weeks) {
      const days = [];
      for (const _ of week.days) {
        days.push({ dayIndex, states: {} });
        dayIndex += 1;
      }
      weekSetup.push({ name: week.name, days });
    }
    return weekSetup;
  }
}
