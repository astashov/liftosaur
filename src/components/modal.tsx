import { h, ComponentChildren, JSX, RefObject } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { IconCloseCircleOutline } from "./icons/iconCloseCircleOutline";
import { createPortal } from "preact/compat";

interface IProps {
  name?: string;
  children: ComponentChildren;
  autofocusInputRef?: RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  preautofocus?: [RefObject<HTMLElement>, (el: HTMLElement) => void][];
  isHidden?: boolean;
  isFullWidth?: boolean;
  isFullHeight?: boolean;
  noPaddings?: boolean;
  shouldShowClose?: boolean;
  overflowHidden?: boolean;
  innerClassName?: string;
  zIndex?: number;
  maxWidth?: string;
  style?: Record<string, string | undefined>;
  onClose?: () => void;
}

export function Modal(props: IProps): JSX.Element {
  const modalRef = useRef<HTMLElement>();

  let className = "fixed inset-0 flex items-center justify-center bottom-sticked";
  if (props.isHidden) {
    className += " invisible";
  }

  const prevProps = useRef<IProps>(props);
  useEffect(() => {
    prevProps.current = props;
  });

  useEffect(() => {
    if (!props.isHidden) {
      document.body.classList.add("stop-scrolling-modal");
    } else {
      document.body.classList.remove("stop-scrolling-modal");
    }
    return () => {
      document.body.classList.remove("stop-scrolling-modal");
    };
  }, [props.isHidden]);

  if (modalRef.current != null && prevProps.current.isHidden && !props.isHidden) {
    for (const [ref, callback] of props.preautofocus ?? []) {
      if (ref.current != null) {
        callback(ref.current);
      }
    }
    if (props.autofocusInputRef?.current != null) {
      modalRef.current.classList.remove("invisible");
      props.autofocusInputRef.current.focus();
    }
  }

  return createPortal(
    <section ref={modalRef} className={className} style={{ zIndex: props.zIndex ?? 40 }}>
      <div
        data-name="overlay"
        onClick={props.shouldShowClose ? props.onClose : undefined}
        className="absolute inset-0 z-10 overflow-scroll scrolling-touch opacity-50 bg-grayv2-700"
      ></div>
      <div
        data-name="modal"
        data-cy={`modal${props.name ? `-${props.name}` : ""}`}
        className={`relative z-20 flex flex-col ${props.noPaddings ? "" : "py-6"} bg-white rounded-lg shadow-lg`}
        style={{
          maxWidth: props.maxWidth ?? "92%",
          maxHeight: "90%",
          width: props.isFullWidth ? "92%" : "auto",
          height: props.isFullHeight ? "90%" : "auto",
          ...props.style,
        }}
      >
        <div
          className={`relative h-full ${props.noPaddings ? "" : "px-6"} ${
            props.overflowHidden ? "overflow-hidden" : "overflow-auto"
          } ${props.innerClassName}`}
        >
          {props.children}
        </div>
        {props.shouldShowClose && (
          <button
            data-cy={`modal-close${props.name ? `-${props.name}` : ""}`}
            onClick={props.onClose}
            className="absolute p-2 nm-modal-close"
            style={{ top: "-3px", right: "-3px" }}
          >
            <IconCloseCircleOutline />
          </button>
        )}
      </div>
    </section>,
    document.getElementById("modal")!
  );
}
