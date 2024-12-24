import { h, JSX, ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

if (typeof window === "undefined") {
  // @ts-ignore
  global.window = {} as Window;
  // @ts-ignore
  global.ZingTouch = {};
}
import ZingTouch from "zingtouch";
import { IconCloseCircleOutline } from "./icons/iconCloseCircleOutline";

interface IProps {
  isHidden: boolean;
  shouldShowClose?: boolean;
  children?: ComponentChildren;
  onClose: () => void;
}

export function BottomSheet(props: IProps): JSX.Element {
  const [bottomShift, setBottomShift] = useState(window.innerHeight);
  const bottomSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bottomSheet = bottomSheetRef.current;
    const height = bottomSheet?.clientHeight;
    setBottomShift(height);
    const zing = new ZingTouch.Region(document.body, false, false);
    zing.bind(
      bottomSheet,
      "swipe",
      (event) => {
        if (event.detail.data[0].currentDirection >= 225 && event.detail.data[0].currentDirection <= 315) {
          props.onClose();
        }
      },
      false
    );
    return () => zing.unbind(bottomSheet, "swipe");
  }, []);

  useEffect(() => {
    setBottomShift(props.isHidden ? bottomSheetRef.current?.clientHeight ?? 0 : 0);
  }, [props.isHidden]);

  return (
    <div className={`fixed inset-0 z-30 ${props.isHidden ? "invisible " : "visible"}`}>
      <div
        data-name="overlay"
        className={`absolute inset-0 bg-grayv2-700 ${props.isHidden ? "opacity-0" : "opacity-50"}`}
        onClick={props.onClose}
      ></div>
      <div
        ref={bottomSheetRef}
        className={`absolute left-0 bottom-0 flex w-full bg-white`}
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
            <IconCloseCircleOutline />
          </button>
        )}
        <div className="w-full safe-area-inset-bottom">{props.children}</div>
      </div>
    </div>
  );
}
