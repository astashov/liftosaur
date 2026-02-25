import { h, JSX } from "preact";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

export function IconHandle(): JSX.Element {
  const color = Tailwind_semantic().icon.neutral;
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" version="1.1">
      <path
        fill={color}
        d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2m0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8m0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14m6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6m0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8m0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14"
      />
    </svg>
  );
}
