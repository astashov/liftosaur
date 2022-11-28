import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { FooterButton } from "./footerButton";
import { IconGraphs2 } from "./icons/iconGraphs2";
import { IconCog2 } from "./icons/iconCog2";
import { Thunk } from "../ducks/thunks";

interface IProps {
  dispatch: IDispatch;
  active?: "graphs" | "settings";
}

export function rightFooterButtons(props: IProps): JSX.Element[] {
  return [
    <FooterButton
      isActive={props.active === "graphs"}
      icon={<IconGraphs2 color={props.active === "graphs" ? "#ff8066" : undefined} />}
      text="Graphs"
      onClick={() => props.dispatch(Thunk.pushScreen("graphs"))}
    />,
    <FooterButton
      icon={<IconCog2 color={props.active === "settings" ? "#ff8066" : undefined} />}
      isActive={props.active === "settings"}
      text="Settings"
      onClick={() => props.dispatch(Thunk.pushScreen("settings"))}
    />,
  ];
}
