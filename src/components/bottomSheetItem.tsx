import { h, JSX } from "preact";

interface IProps {
  title: string;
  icon: JSX.Element;
  isFirst?: boolean;
  description: string;
  onClick: () => void;
}

export function BottomSheetItem(props: IProps): JSX.Element {
  return (
    <button
      className={`block text-base text-left ${!props.isFirst ? "border-t border-grayv2-100 mt-4" : ""}`}
      onClick={props.onClick}
    >
      <div className={`flex items-center ${!props.isFirst ? "pt-4" : ""}`}>
        <div>{props.icon}</div>
        <div className="flex-1 pl-3">{props.title}</div>
      </div>
      <div className="pt-2 text-xs text-grayv2-main">{props.description}</div>
    </button>
  );
}
