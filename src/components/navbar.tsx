import { h, JSX, ComponentChildren } from "preact";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { IScreen } from "../models/screen";
import { IconBack } from "./icons/iconBack";
import { IconHelp } from "./icons/iconHelp";
import { useEffect, useState } from "preact/hooks";

interface INavbarCenterProps {
  title: ComponentChildren;
  subtitle?: ComponentChildren;
}

interface INavbarProps extends INavbarCenterProps {
  dispatch: IDispatch;
  numberOfButtons: number;
  screenStack: IScreen[];
}

export const NavbarView = (props: INavbarProps): JSX.Element => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => {
      if (window.pageYOffset > 0 && !isScrolled) {
        setIsScrolled(true);
      } else if (window.pageYOffset === 0 && isScrolled) {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  });

  let className = "fixed top-0 left-0 z-20 flex items-center justify-center w-full px-2 text-center bg-white";
  if (isScrolled) {
    className += " has-shadow";
  }

  return (
    <div className={className} style={{ transition: "box-shadow 0.2s ease-in-out" }}>
      <div className="flex items-center justify-center" style={{ minWidth: props.numberOfButtons * 40 }}>
        {props.screenStack.length > 1 ? (
          <button className="p-2" onClick={() => props.dispatch(Thunk.pullScreen())}>
            <IconBack />
          </button>
        ) : undefined}
      </div>
      <NavbarCenterView {...props} />
      <div className="flex items-center justify-center" style={{ minWidth: props.numberOfButtons * 40 }}>
        <button className="p-2">
          <IconHelp />
        </button>
      </div>
    </div>
  );
};

export function NavbarCenterView(props: INavbarCenterProps): JSX.Element {
  if (props.subtitle != null) {
    return (
      <div className="flex-1">
        <div className="pt-2 text-xs">{props.subtitle}</div>
        <div className="pb-2 text-sm">{props.title}</div>
      </div>
    );
  } else {
    return (
      <div className="flex-1 py-2">
        <div className="py-2 text-xl font-semibold">{props.title}</div>
      </div>
    );
  }
}
