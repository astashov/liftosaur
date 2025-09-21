import { h, JSX } from "preact";

interface IProps {
  title: string;
  name: string;
  icon?: JSX.Element;
  isFirst?: boolean;
  description?: string | JSX.Element;
  className?: string;
  onClick: () => void;
}

export function BottomSheetItem(props: IProps): JSX.Element {
  return (
    <button
      data-cy={`bottom-sheet-${props.name}`}
      style={{ outline: "none" }}
      className={`block text-base w-full text-left ${!props.isFirst ? "border-t border-border-neutral mt-4" : ""} ${
        props.className
      } nm-${props.name}`}
      onClick={props.onClick}
    >
      <div className={`flex items-center ${!props.isFirst ? "pt-4" : ""}`}>
        {props.icon && <div>{props.icon}</div>}
        <div className="flex-1 pl-3">{props.title}</div>
      </div>
      {props.description && <div className="pt-2 text-xs text-text-secondary">{props.description}</div>}
    </button>
  );
}
