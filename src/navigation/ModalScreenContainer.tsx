import { JSX, ReactNode, useEffect } from "react";
import { IconCloseCircleOutline } from "../components/icons/iconCloseCircleOutline";

interface IProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  isFullWidth?: boolean;
  isFullHeight?: boolean;
  noPaddings?: boolean;
  overflowHidden?: boolean;
  innerClassName?: string;
}

export function ModalScreenContainer(props: IProps): JSX.Element {
  useEffect(() => {
    document.body.classList.add("stop-scrolling-modal");
    return () => {
      document.body.classList.remove("stop-scrolling-modal");
    };
  }, []);

  return (
    <section className="fixed inset-0 flex items-center justify-center bottom-sticked" style={{ zIndex: 40 }}>
      <div
        data-name="overlay"
        onClick={props.onClose}
        className="absolute inset-0 z-10 overflow-scroll scrolling-touch opacity-50 bg-background-darkgray"
      ></div>
      <div
        data-name="modal"
        className={`relative z-20 flex flex-col ${props.noPaddings ? "" : "py-6"} bg-background-default rounded-lg shadow-lg text-text-primary`}
        style={{
          maxWidth: props.maxWidth ?? "92%",
          maxHeight: "90%",
          width: props.isFullWidth ? "92%" : "auto",
          height: props.isFullHeight ? "90%" : "auto",
        }}
      >
        <div
          className={`relative h-full ${props.noPaddings ? "" : "px-6"} ${
            props.overflowHidden ? "overflow-hidden" : "overflow-auto"
          } ${props.innerClassName ?? ""}`}
        >
          {props.children}
        </div>
        <button onClick={props.onClose} className="absolute p-2 nm-modal-close" style={{ top: "-3px", right: "-3px" }}>
          <IconCloseCircleOutline />
        </button>
      </div>
    </section>
  );
}
