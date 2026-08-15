import type { JSX } from "react";
import { IconMoon } from "./icons/iconMoon";
import { IconSun } from "./icons/iconSun";
import { PageTheme_toggle } from "../utils/pageTheme";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  size?: number;
  isWhite?: boolean;
  className?: string;
}

// Which icon is visible is driven by the `dark`/`light` class on <html> rather than React state,
// so the server-rendered markup matches whatever theme the pre-paint script picked.
export function ThemeToggle(props: IProps): JSX.Element {
  const size = props.size ?? 20;
  const color = props.isWhite ? Tailwind_semantic().icon.white : Tailwind_semantic().text.primary;
  return (
    <button
      className={`p-2 leading-none nm-theme-toggle cursor-pointer ${props.className || ""}`}
      title="Switch between dark and light theme"
      aria-label="Switch between dark and light theme"
      onClick={() => PageTheme_toggle()}
    >
      <span className="block dark:hidden">
        <IconMoon size={size} color={color} />
      </span>
      <span className="hidden dark:block">
        <IconSun size={size} color={color} />
      </span>
    </button>
  );
}
