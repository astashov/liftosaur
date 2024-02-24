import { h, ComponentChildren, JSX, RefObject } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { IconCloseCircleOutline } from "./icons/iconCloseCircleOutline";

interface IProps {
  name?: string;
  children: ComponentChildren;
  autofocusInputRef?: RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  preautofocus?: [RefObject<HTMLElement>, (el: HTMLElement) => void][];
  isHidden?: boolean;
  isFullWidth?: boolean;
  noPaddings?: boolean;
  shouldShowClose?: boolean;
  overflowHidden?: boolean;
  style?: Record<string, string | undefined>;
  onClose?: () => void;
}

export function Modal(props: IProps): JSX.Element {
  const modalRef = useRef<HTMLElement>();

  let className = "fixed inset-0 flex items-center justify-center";
  if (props.isHidden) {
    className += " invisible";
  }

  const prevProps = useRef<IProps>(props);
  useEffect(() => {
    prevProps.current = props;
  });

  useEffect(() => {
    if (!props.isHidden) {
      document.body.classList.add("stop-scrolling");
    } else {
      document.body.classList.remove("stop-scrolling");
    }
    return () => {
      document.body.classList.remove("stop-scrolling");
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

  return (
    <section ref={modalRef} className={className} style={{ zIndex: 100 }}>
      <div
        data-name="overlay"
        onClick={props.shouldShowClose ? props.onClose : undefined}
        className="absolute inset-0 z-10 overflow-scroll scrolling-touch opacity-50 bg-grayv2-700"
      ></div>
      <div
        data-name="modal"
        data-cy={`modal${props.name ? `-${props.name}` : ""}`}
        className={`relative z-20 flex flex-col ${props.noPaddings ? "" : "py-6"} bg-white rounded-lg shadow-lg`}
        style={{ maxWidth: "85%", maxHeight: "90%", width: props.isFullWidth ? "85%" : "auto", ...props.style }}
      >
        <div className={`relative h-full px-6 ${props.overflowHidden ? "overflow-hidden" : "overflow-auto"}`}>
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
    </section>
  );
}
