import { h, JSX, Fragment } from "preact";
import { IconQuestion } from "./iconQuestion";
import { IconClose } from "./iconClose";
import { useState } from "preact/hooks";

interface IProps {
  name: string;
  help?: JSX.Element;
}

export function GroupHeader(props: IProps): JSX.Element {
  const { name, help } = props;
  const [isHelpShown, setIsHelpShown] = useState<boolean>(false);

  return (
    <Fragment>
      <div className="flex px-6 py-1 text-sm font-bold bg-gray-200">
        <div className="">{name}</div>
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
    </Fragment>
  );
}
