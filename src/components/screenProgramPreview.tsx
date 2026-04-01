import type { JSX } from "react";
import { IDispatch } from "../ducks/types";
import { IProgram, ISettings, ISubscription } from "../types";
import { INavCommon, IState, updateState } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";
import { ProgramPreview } from "./programPreview";
import { MenuItemEditable } from "./menuItemEditable";
import { lb } from "lens-shmens";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  programs: IProgram[];
  selectedProgramId: string;
  subscription: ISubscription;
  navCommon: INavCommon;
}

export function ScreenProgramPreview(props: IProps): JSX.Element {
  const program = props.programs.filter((p) => p.id === props.selectedProgramId)[0];

  useNavOptions({ navTitle: "Program Preview" });

  return (
    <div>
      <section className="px-4">
        <MenuItemEditable
          type="select"
          name="Program"
          value={props.selectedProgramId}
          values={props.programs.map((p) => [p.id, p.name])}
          onChange={(value) => {
            if (value != null) {
              updateState(
                props.dispatch,
                [lb<IState>().pi("previewProgram").p("id").record(value)],
                "Select preview program"
              );
            }
          }}
        />

        <ProgramPreview
          hasNavbar={true}
          key={props.selectedProgramId}
          isMobile={true}
          dispatch={props.dispatch}
          settings={props.settings}
          program={program}
          subscription={props.subscription}
          stats={props.navCommon.stats}
        />
      </section>
    </div>
  );
}
