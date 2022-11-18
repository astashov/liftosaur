import { h, JSX, Fragment, ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { IconArrowUp } from "./icons/iconArrowUp";

interface IProps {
  name: string;
  help?: JSX.Element;
  children?: ComponentChildren;
  rightAddOn?: JSX.Element;
  isExpanded?: boolean;
  topPadding?: boolean;
}

export function GroupHeader(props: IProps): JSX.Element {
  const { name } = props;
  const [isExpanded, setIsExpanded] = useState<boolean>(!!props.isExpanded);

  return (
    <Fragment>
      <div
        onClick={props.children ? () => setIsExpanded(!isExpanded) : undefined}
        className={`flex pt-4 pb-1 text-sm text-grayv2-700 ${props.topPadding ? "mt-6" : ""}`}
      >
        <div className="flex-1">
          <span className="text-xs align-middle text-grayv2-700">{name}</span>
        </div>
        <div className="flex items-center justify-center text-right">
          {props.rightAddOn}
          {props.children ? isExpanded ? <IconArrowUp /> : <IconArrowDown2 /> : null}
        </div>
      </div>
      {isExpanded && props.children}
    </Fragment>
  );
}
