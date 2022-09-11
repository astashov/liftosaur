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
        className="flex px-4 pt-4 pb-1 text-sm text-grayv2"
      >
        <div>
          <span className="text-xs align-middle text-grayv2">{name}</span>
        </div>
      </div>
      {isExpanded && props.children}
    </Fragment>
  );
}
