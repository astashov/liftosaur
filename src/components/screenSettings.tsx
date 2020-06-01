import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { MenuItem } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { programsList, IProgramId } from "../models/program";
import { ObjectUtils } from "../utils/object";
import { Thunk } from "../ducks/thunks";

interface IProps {
  dispatch: IDispatch;
  email?: string;
  currentProgram: IProgramId;
}

export function ScreenSettings(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView title="Settings" left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>} />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <MenuItem
          name="Account"
          value={props.email}
          shouldShowRightArrow={true}
          onClick={() => props.dispatch(Thunk.pushScreen("account"))}
        />
        <MenuItemEditable
          name="Current Program"
          type="select"
          values={ObjectUtils.keys(programsList).map((k) => [programsList[k].id, programsList[k].name])}
          value={props.currentProgram}
          onChange={(newValue?: string) => {
            props.dispatch({ type: "ChangeProgramAction", name: newValue as IProgramId });
          }}
        />
        <MenuItem
          name="Program Settings"
          onClick={() => props.dispatch(Thunk.pushScreen("programSettings"))}
          shouldShowRightArrow={true}
        />
        <MenuItem
          name="Timers"
          onClick={() => props.dispatch(Thunk.pushScreen("timers"))}
          shouldShowRightArrow={true}
        />
        <MenuItem
          shouldShowRightArrow={true}
          name="Available Plates"
          onClick={() => props.dispatch(Thunk.pushScreen("plates"))}
        />
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
