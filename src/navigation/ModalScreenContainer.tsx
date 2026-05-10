import { JSX, ReactNode, UIEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCloseCircleOutline } from "../components/icons/iconCloseCircleOutline";
import type { IScrollEventLike } from "../utils/useScrollProgressiveList";

interface IProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  isFullWidth?: boolean;
  isFullHeight?: boolean;
  noPaddings?: boolean;
  overflowHidden?: boolean;
  innerClassName?: string;
  shouldShowClose?: boolean;
  zIndex?: number;
  overlay?: ReactNode;
  overlayDetent?: number;
  onScroll?: (e: IScrollEventLike) => void;
}

export function ModalScreenContainer(props: IProps): JSX.Element {
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainerRef(document.getElementById("modal"));
    document.body.classList.add("stop-scrolling-modal");
    return () => {
      document.body.classList.remove("stop-scrolling-modal");
    };
  }, []);

  const element = (
    <section
      className="fixed inset-0 flex items-center justify-center bottom-sticked"
      style={{ zIndex: props.zIndex ?? 50 }}
    >
      <div
        data-name="overlay"
        onClick={props.onClose}
        className="absolute inset-0 z-10 overflow-scroll scrolling-touch opacity-50 bg-background-darkgray"
      ></div>
      <div
        data-name="modal"
        data-testid="modal"
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
            props.overflowHidden || props.overlay ? "overflow-hidden" : "overflow-auto"
          } ${props.innerClassName ?? ""}`}
          onScroll={
            props.onScroll
              ? (e: UIEvent<HTMLDivElement>) => {
                  const t = e.currentTarget;
                  props.onScroll!({
                    nativeEvent: {
                      contentOffset: { y: t.scrollTop },
                      contentSize: { height: t.scrollHeight },
                      layoutMeasurement: { height: t.clientHeight },
                    },
                  });
                }
              : undefined
          }
        >
          {props.children}
        </div>
        {props.overlay}
        {props.shouldShowClose !== false && (
          <button
            data-testid="modal-close"
            onClick={props.onClose}
            className="absolute p-2 nm-modal-close"
            style={{ top: "-3px", right: "-3px" }}
          >
            <IconCloseCircleOutline />
          </button>
        )}
      </div>
    </section>
  );

  if (!containerRef) {
    return <></>;
  }
  return createPortal(element, containerRef);
}
