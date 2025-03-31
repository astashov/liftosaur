import { lb } from "lens-shmens";
import { ComponentChildren, h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { IconClose2 } from "./icons/iconClose2";
import { IconHelp } from "./icons/iconHelp";
import { Tailwind } from "../utils/tailwindConfig";

interface IProps {
  dispatch: IDispatch;
  id: string;
  helps: string[];
  className?: string;
  children: ComponentChildren;
}

export function Nux(props: IProps): JSX.Element | null {
  if (props.helps.indexOf(props.id) !== -1) {
    return null;
  }
  const { dispatch } = props;
  return (
    <div className={`${props.className} flex py-2 pl-4 text-xs bg-white border border-purplev3-100 rounded-2xl`}>
      <div>
        <div className="inline-block mr-1 align-middle">
          <IconHelp color={Tailwind.colors().purple[500]} size={16} />
        </div>
        {props.children}
      </div>
      <div>
        <button
          className="p-2 nm-nux-close"
          style={{ marginTop: "-0.5rem" }}
          onClick={() => {
            updateState(dispatch, [
              lb<IState>()
                .p("storage")
                .p("helps")
                .recordModify((helps) => [...helps, props.id]),
            ]);
          }}
        >
          <IconClose2 size={12} />
        </button>
      </div>
    </div>
  );
}
