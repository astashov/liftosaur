import { h, JSX, Fragment, ComponentChildren } from "preact";
import { IconQuestion } from "./iconQuestion";
import { IconClose } from "./iconClose";
import { useState } from "preact/hooks";
import { IconArrowDown } from "./iconArrowDown";

interface IProps {
  name: string;
  help?: JSX.Element;
  children?: ComponentChildren;
}

export function GroupHeader(props: IProps): JSX.Element {
  const { name, help } = props;
  const [isHelpShown, setIsHelpShown] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <Fragment>
      <div
        onClick={props.children ? () => setIsExpanded(!isExpanded) : undefined}
        className="flex px-6 py-1 text-sm font-bold bg-gray-200 border-b border-gray-300"
      >
        <div>
          {props.children ? (
            <span>
              <span className="text-sm font-bold align-middle">{name}</span>
              <IconArrowDown
                fill="#4a5568"
                style={{
                  verticalAlign: "bottom",
                  width: "20px",
                  height: "20px",
                  display: "inline-block",
                  transform: `rotate(${isExpanded ? 0 : 270}deg)`,
                }}
              />
            </span>
          ) : (
            name
          )}
        </div>
        {help && (
          <button className={`ls-group-header-help-${name} ml-auto`} onClick={() => setIsHelpShown(!isHelpShown)}>
            <IconQuestion />
          </button>
        )}
      </div>
      {isHelpShown && (
        <div className="flex items-center px-6 py-1 text-xs italic">
          <p className="flex-1">{help}</p>
          <button className="ml-2" onClick={() => setIsHelpShown(false)}>
            <div className="p-1">
              <IconClose size={12} />
            </div>
          </button>
        </div>
      )}
      {isExpanded && props.children}
    </Fragment>
  );
}
