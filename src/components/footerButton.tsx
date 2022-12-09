import { h, JSX } from "preact";
import { StringUtils } from "../utils/string";

export interface IProps {
  icon: JSX.Element;
  text: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function FooterButton(props: IProps): JSX.Element {
  const dataCy = `footer-${StringUtils.dashcase(props.text)}`;
  return (
    <button className="inline-block px-2 text-center" data-cy={dataCy} onClick={props.onClick}>
      {props.icon}
      <div style={{ fontSize: "10px" }} className={`pt-1 ${props.isActive ? "text-orangev2" : ""}`}>
        {props.text}
      </div>
    </button>
  );
}
