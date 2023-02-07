import { h, JSX } from "preact";
import { IScreen, ITab, Screen } from "../models/screen";
import { StringUtils } from "../utils/string";

export interface IProps {
  name: ITab;
  icon: (isActive: boolean) => JSX.Element;
  screen: IScreen;
  text: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function FooterButton(props: IProps): JSX.Element {
  const isActive = Screen.tab(props.screen) === props.name;
  const dataCy = `footer-${StringUtils.dashcase(props.text)}`;
  return (
    <button className="inline-block px-2 text-center" data-cy={dataCy} onClick={props.onClick}>
      {props.icon(isActive)}
      <div style={{ fontSize: "10px" }} className={`pt-1 ${isActive ? "text-purplev2-main" : ""}`}>
        {props.text}
      </div>
    </button>
  );
}
