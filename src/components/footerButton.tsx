import { h, JSX } from "preact";

export interface IProps {
  icon: JSX.Element;
  text?: string;
  onClick?: () => void;
}

export function FooterButton(props: IProps): JSX.Element {
  return (
    <button className="inline-block px-2 text-center" onClick={props.onClick}>
      {props.icon}
      <div style={{ fontSize: "10px" }} className="pt-1">
        {props.text}
      </div>
    </button>
  );
}
