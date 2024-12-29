import React, { JSX } from "react";
import { useState } from "react";
import { StringUtils } from "../utils/string";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { IconArrowUp } from "./icons/iconArrowUp";
import { IconHelp } from "./icons/iconHelp";

interface IProps {
  name: string;
  help?: JSX.Element;
  size?: "small" | "large";
  children?: React.ReactNode;
  rightAddOn?: JSX.Element;
  leftExpandIcon?: boolean;
  isExpanded?: boolean;
  topPadding?: boolean;
  highlighted?: boolean;
}

export function GroupHeader(props: IProps): JSX.Element {
  const { name } = props;
  const [isExpanded, setIsExpanded] = useState<boolean>(!!props.isExpanded);
  const [isHelpShown, setIsHelpShown] = useState<boolean>(false);
  const size = props.size || "small";
  const testId = `group-header-${StringUtils.dashcase(name)}`;

  return (
    <>
      <div
        data-cy={testId}
        onClick={props.children ? () => setIsExpanded(!isExpanded) : undefined}
        className={`flex items-center pb-1 text-sm text-grayv2-700 ${props.children ? "cursor-pointer" : ""} ${
          props.topPadding ? "mt-6 pt-4" : ""
        }`}
      >
        {props.children && props.leftExpandIcon && (
          <div className="flex items-center justify-center mr-2 text-left">
            {isExpanded ? <IconArrowUp /> : <IconArrowDown2 />}
          </div>
        )}
        <div className="flex-1">
          <span
            className={`${size === "small" ? "text-xs" : "text-base font-bold"} ${
              props.highlighted ? "text-purplev2-main" : "text-grayv2-700"
            } align-middle`}
          >
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
    </>
  );
}
