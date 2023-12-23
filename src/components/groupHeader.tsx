import { h, JSX, Fragment, ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { StringUtils } from "../utils/string";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { IconArrowUp } from "./icons/iconArrowUp";
import { IconHelp } from "./icons/iconHelp";

interface IProps {
  name: string;
  help?: JSX.Element;
  size?: "small" | "large";
  children?: ComponentChildren;
  rightAddOn?: JSX.Element;
  leftExpandIcon?: boolean;
  isExpanded?: boolean;
  topPadding?: boolean;
}

export function GroupHeader(props: IProps): JSX.Element {
  const { name } = props;
  const [isExpanded, setIsExpanded] = useState<boolean>(!!props.isExpanded);
  const [isHelpShown, setIsHelpShown] = useState<boolean>(false);
  const size = props.size || "small";
  const testId = `group-header-${StringUtils.dashcase(name)}`;

  return (
    <Fragment>
      <div
        data-cy={testId}
        onClick={props.children ? () => setIsExpanded(!isExpanded) : undefined}
        className={`flex pb-1 text-sm text-grayv2-700 ${props.children ? "cursor-pointer" : ""} ${
          props.topPadding ? "mt-6 pt-4" : ""
        }`}
      >
        <div className="flex items-center justify-center mr-2 text-left">
          {props.children && props.leftExpandIcon ? isExpanded ? <IconArrowUp /> : <IconArrowDown2 /> : null}
        </div>
        <div className="flex-1">
          <span className={`${size === "small" ? "text-xs" : "text-base font-bold"} align-middle text-grayv2-700`}>
            {name}
          </span>
        </div>
        <div className="flex items-center justify-center text-right">
          {props.rightAddOn}
          {props.help && (
            <button
              style={{ marginRight: "-0.5rem" }}
              className="px-2 nm-group-header-help"
              onClick={() => setIsHelpShown(!isHelpShown)}
            >
              <IconHelp size={20} color="#607284" />
            </button>
          )}
          {props.children && !props.leftExpandIcon ? isExpanded ? <IconArrowUp /> : <IconArrowDown2 /> : null}
        </div>
      </div>
      {isHelpShown && props.help}
      {isExpanded && props.children}
    </Fragment>
  );
}
