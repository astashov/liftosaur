import { h, JSX } from "preact";

export function SetNumber(props: { setIndex: number; size?: "md" | "sm" }): JSX.Element {
  return (
    <div
      className={`flex items-center justify-center ${
        props.size === "sm" ? "w-5 h-5 font-bold text-xs" : "w-6 h-6 font-bold"
      } border rounded-full border-grayv2-main text-grayv2-main`}
    >
      {props.setIndex + 1}
    </div>
  );
}
