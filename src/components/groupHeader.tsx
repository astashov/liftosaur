import { h, JSX, Fragment, ComponentChildren } from "preact";
import { useState } from "preact/hooks";

interface IProps {
  name: string;
  help?: JSX.Element;
  children?: ComponentChildren;
  rightAddOn?: JSX.Element;
}

export function GroupHeader(props: IProps): JSX.Element {
  const { name } = props;
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <Fragment>
      <div
        onClick={props.children ? () => setIsExpanded(!isExpanded) : undefined}
        className="flex px-4 pt-4 pb-1 text-sm text-grayv2-700"
      >
        <div className="flex-1">
          <span className="text-xs align-middle text-grayv2-700">{name}</span>
        </div>
        {props.rightAddOn && <div className="text-right">{props.rightAddOn}</div>}
      </div>
      {isExpanded && props.children}
    </Fragment>
  );
}
