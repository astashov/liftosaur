import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { INavCommon } from "../../models/state";
import { IProgram, ISettings } from "../../types";
import { Surface } from "../surface";
import { NavbarView } from "../navbar";
import { Footer2View } from "../footer2";
import { MigrationBanner } from "../migrationBanner";
import { Thunk } from "../../ducks/thunks";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";

interface IProps {
  editProgram: IProgram;
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function EditProgramDaysList(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={<NavbarView navCommon={props.navCommon} dispatch={props.dispatch} title="Edit Program" />}
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        <MigrationBanner program={props.editProgram} settings={props.settings} client={window.fetch.bind(window)} />
        <GroupHeader name="Current Program" />
        <MenuItem
          name="Program"
          value={props.editProgram.name}
          expandValue={true}
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk.pushScreen("programs"))}
        />
      </section>
    </Surface>
  );
}
