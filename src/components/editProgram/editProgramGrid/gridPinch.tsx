import { JSX, ReactNode, useCallback } from "react";
import { ScrollViewProps, View } from "react-native";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

export const GRID_SCALE_MIN = 0.45;
export const GRID_SCALE_MAX = 2.2;
const SCALE_STEP = 0.05;

export interface IGridPinchArgs {
  scale: number;
  isFitted: boolean;
  fittedScale: number;
  onScalePreview: (scale: number) => void;
  onScaleCommit: (scale: number | undefined) => void;
}

export interface IGridPinchResult {
  Wrap: (props: { children: ReactNode }) => JSX.Element;
  scrollAnimatedProps?: Partial<ScrollViewProps>;
  // Whether there is a pinch to tell the user about. Answered here rather than by a `Platform`
  // check at the hint, so the two platforms' answer stays in the two files that implement it.
  canPinch: boolean;
  zoomControl?: JSX.Element;
}

// Gesture handler is known to eat scrolling inside the mobile webview, so web zooms with a slider.
export function useGridPinch(args: IGridPinchArgs): IGridPinchResult {
  const Wrap = useCallback((props: { children: ReactNode }): JSX.Element => <View>{props.children}</View>, []);
  const { onScalePreview, onScaleCommit } = args;
  const commit = (e: { currentTarget: HTMLInputElement }): void => onScaleCommit(Number(e.currentTarget.value));
  const zoomControl = (
    <div className="flex items-center justify-end gap-2 px-4 pb-2 text-xs text-text-secondary">
      <button
        type="button"
        className={`px-2 py-1 rounded ${args.isFitted ? "text-text-disabled" : "text-text-link"}`}
        disabled={args.isFitted}
        onClick={() => onScaleCommit(undefined)}
      >
        Fit
      </button>
      <span>Week width</span>
      <input
        type="range"
        aria-label="Week width"
        data-testid="grid-zoom"
        className="w-32 cursor-pointer"
        style={{ accentColor: Tailwind_semantic().icon.purple }}
        min={GRID_SCALE_MIN}
        max={Math.max(GRID_SCALE_MAX, args.fittedScale)}
        step={SCALE_STEP}
        value={args.scale}
        onInput={(e) => onScalePreview(Number(e.currentTarget.value))}
        onPointerUp={commit}
        onKeyUp={commit}
      />
    </div>
  );
  return { Wrap, canPinch: false, zoomControl };
}
