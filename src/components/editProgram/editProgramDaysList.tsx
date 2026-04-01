import type { JSX } from "react";
import { IDispatch } from "../../ducks/types";
import { INavCommon } from "../../models/state";
import { IProgram, ISettings } from "../../types";
import { useNavOptions } from "../../navigation/useNavOptions";
import { MigrationBanner } from "../migrationBanner";
import { Thunk_pushScreen } from "../../ducks/thunks";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";

interface IProps {
  editProgram: IProgram;
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
}

export function EditProgramDaysList(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Edit Program" });

  return (
    <section className="px-4">
      <MigrationBanner program={props.editProgram} settings={props.settings} client={window.fetch.bind(window)} />
      <GroupHeader name="Current Program" />
      <MenuItem
        name="Program"
        value={props.editProgram.name}
        expandValue={true}
        shouldShowRightArrow={true}
        onClick={() => props.dispatch(Thunk_pushScreen("programs"))}
      />
    </section>
  );
}
