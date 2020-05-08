import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { MenuItem } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { programsList, IProgramId } from "../models/program";
import { ObjectUtils } from "../utils/object";

interface IProps {
  dispatch: IDispatch;
  email?: string;
  currentProgram: IProgramId;
}

export function ScreenSettings(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full">
      <HeaderView
        title="Settings"
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section className="flex-1 w-full">
        <MenuItem
          name="Account"
          value={props.email}
          shouldShowRightArrow={true}
          onClick={() => props.dispatch({ type: "PushScreen", screen: "account" })}
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
          onClick={() => props.dispatch({ type: "PushScreen", screen: "programSettings" })}
          shouldShowRightArrow={true}
        />
        <MenuItem
          name="Timers"
          onClick={() => props.dispatch({ type: "PushScreen", screen: "timers" })}
          shouldShowRightArrow={true}
        />
        <MenuItem
          shouldShowRightArrow={true}
          name="Available Plates"
          onClick={() => props.dispatch({ type: "PushScreen", screen: "plates" })}
        />
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
