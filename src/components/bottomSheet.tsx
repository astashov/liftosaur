import { h, JSX, ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { IconCloseCircleOutline } from "./icons/iconCloseCircleOutline";
import { createPortal } from "preact/compat";

interface IProps {
  isHidden: boolean;
  shouldShowClose?: boolean;
  children?: ComponentChildren;
  onClose: () => void;
}

export function BottomSheet(props: IProps): JSX.Element {
  const [bottomShift, setBottomShift] = useState(typeof window !== "undefined" ? window.innerHeight : 0);
  const bottomSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.isHidden) {
      window.setTimeout(() => document.body.classList.add(`stop-scrolling-bottom-sheet`), 1000);
    } else {
      window.setTimeout(() => document.body.classList.remove("stop-scrolling-bottom-sheet"), 1000);
    }
    return () => {
      document.body.classList.remove("stop-scrolling-bottom-sheet");
    };
  }, [props.isHidden]);

  useEffect(() => {
    const bottomSheet = bottomSheetRef.current;
    const height = bottomSheet?.clientHeight;
    setBottomShift(height);
  }, []);

  useEffect(() => {
    setBottomShift(props.isHidden ? (bottomSheetRef.current?.clientHeight ?? 0) : 0);
  }, [props.isHidden]);
  const containerRef = typeof window !== "undefined" ? window.document.getElementById("bottomsheet") : undefined;

  const element = (
    <div className={`fixed inset-0 z-40 pointer-events-none`} data-cy="bottom-sheet-container">
      <div
        data-name="overlay"
        className={`pointer-events-auto absolute inset-0 bg-grayv2-700 will-change-transform ${
          props.isHidden ? "invisible opacity-0" : "visible opacity-50"
        }`}
        style={{
          transition: "visibility 0.2s ease-out, opacity 0.2s ease-out",
        }}
        onClick={props.onClose}
      ></div>
      <div
        ref={bottomSheetRef}
        className={`bottom-sticked absolute bottom-0 left-0 flex w-full overflow-y-auto bg-white pointer-events-auto will-change-transform ${
          props.isHidden ? "invisible" : "visible"
        }`}
        data-cy="bottom-sheet"
        style={{
          transition: "transform 0.2s ease-out, visibility 0.2s",
          transform: `translateY(${bottomShift}px)`,
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -5px 15px rgb(0 0 0 / 30%)",
        }}
      >
        {props.shouldShowClose && (
          <button
            data-cy={`bottom-sheet-close`}
            onClick={props.onClose}
            className="absolute top-0 right-0 z-10 p-2 nm-bottom-sheet-close"
          >
            <IconCloseCircleOutline size={28} />
          </button>
        )}
        <div className="flex flex-col w-full safe-area-inset-bottom" style={{ maxHeight: "90vh" }}>
          <div className="flex items-center justify-center pt-2">
            <div className="w-8 rounded-sm bg-grayv3-400" style={{ height: "3px" }} />
          </div>
          {props.children}
        </div>
      </div>
    </div>
  );

  return containerRef ? createPortal(element, containerRef) : element;
}
