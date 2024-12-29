import React, { JSX } from "react";
import { useEffect, useRef, useState } from "react";

interface IProps {
  isHidden: boolean;
  children?: React.ReactNode;
  onClose: () => void;
}

export function BottomSheet(props: IProps): JSX.Element {
  const [bottomShift, setBottomShift] = useState(-99999);
  const bottomSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bottomSheet = bottomSheetRef.current;
    const height = bottomSheet?.clientHeight;
    setBottomShift(height ?? -99999);
  }, []);

  useEffect(() => {
    setBottomShift(props.isHidden ? bottomShift : 0);
  }, [props.isHidden]);

  return (
    <div className={`fixed inset-0 z-30 ${props.isHidden ? "invisible " : ""}`}>
      <div
        data-name="overlay"
        className={`absolute inset-0 bg-grayv2-700 ${props.isHidden ? "opacity-0" : "opacity-50"}`}
        onClick={props.onClose}
      ></div>
      <div
        ref={bottomSheetRef}
        className={`absolute left-0 bottom-0 flex w-full bg-white`}
        style={{
          transform: `translateY(${bottomShift}px)`,
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -5px 15px rgb(0 0 0 / 30%)",
        }}
      >
        <div className="w-full safe-area-inset-bottom">{props.children}</div>
      </div>
    </div>
  );
}
