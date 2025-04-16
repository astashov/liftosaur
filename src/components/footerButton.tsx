import { h, JSX } from "preact";
import { IScreen, ITab, Screen } from "../models/screen";
import { StringUtils } from "../utils/string";

export interface IProps {
  name: ITab;
  icon: (isActive: boolean) => JSX.Element;
  screen: IScreen;
  hasDot?: boolean;
  text: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function FooterButton(props: IProps): JSX.Element {
  const isActive = Screen.tab(props.screen) === props.name;
  const dataCy = `footer-${StringUtils.dashcase(props.text)}`;
  return (
    <button
      className={`touch-manipulation inline-block px-2 text-center relative nm-${dataCy}`}
      data-cy={dataCy}
      onClick={props.onClick}
    >
      {props.hasDot && (
        <div
          className="w-2 h-2 rounded-full bg-redv2-700"
          style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}
        />
      )}
      {props.icon(isActive)}
      <div
        style={{ fontSize: "0.625rem" }}
        className={`pt-1 whitespace-nowrap text-ellipsis ${isActive ? "text-purplev2-main" : ""}`}
      >
        {props.text}
      </div>
    </button>
  );
}
