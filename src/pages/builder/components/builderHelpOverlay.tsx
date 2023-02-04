import { JSX } from "preact";

import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { CollectionUtils } from "../../../utils/collection";
import { ObjectUtils } from "../../../utils/object";
import { IconLogo } from "../../../components/icons/iconLogo";

type IPosition = "top" | "bottom" | "left" | "right" | "center";
type IRect = { left: number; top: number; width: number; height: number };

interface IHelp {
  id: string;
  content: JSX.Element | string;
  order: number;
  position: IPosition;
  rect: IRect;
  offsetX: number;
  offsetY: number;
  height?: number;
}

export function BuilderHelpOverlay(): JSX.Element | null {
  const [helps, setHelps] = useState<IHelp[]>([]);
  const [displayed, setDisplayed] = useState<number>(Infinity);

  useEffect(() => {
    const helpsMap = Array.from(document.querySelectorAll("[data-help]")).reduce<Record<string, IHelp>>(
      (memo, e) => {
        const id = e.getAttribute("data-help-id")!;
        if (!memo[id]) {
          const boundingClientRect = e.getBoundingClientRect();
          console.log(boundingClientRect);
          memo[id] = {
            id,
            content: e.getAttribute("data-help")!,
            order: parseInt(e.getAttribute("data-help-order") || "1", 10),
            position: e.getAttribute("data-help-position") as IPosition,
            rect: {
              left: boundingClientRect.left + window.pageXOffset,
              top: boundingClientRect.top + window.pageYOffset,
              width: boundingClientRect.width,
              height: boundingClientRect.height,
            },
            height: e.getAttribute("data-help-height") ? parseInt(e.getAttribute("data-help-height")!, 10) : undefined,
            offsetX: e.getAttribute("data-help-offset-x") ? parseInt(e.getAttribute("data-help-offset-x")!, 10) : 0,
            offsetY: e.getAttribute("data-help-offset-y") ? parseInt(e.getAttribute("data-help-offset-y")!, 10) : 0,
          };
        }
        return memo;
      },
      {
        intro: {
          id: "intro",
          content: (
            <div className="flex items-center justify-center">
              <div className="mr-8">
                <IconLogo style={{ filter: "drop-shadow(0px 0px 4px rgba(255, 255, 255, 1))" }} />
              </div>
              <div className="flex-1">
                Welcome to the weightlifting program builder! Build your workouts and making sure you get enough weekly
                volume for the muscles you need, and balance the time you spend in the gym.
              </div>
            </div>
          ),
          order: 0,
          position: "center",
          offsetX: 0,
          offsetY: 0,
          rect: { left: 0, top: 0, width: 0, height: 0 },
        },
        outro: {
          id: "outro",
          content:
            "To speed up the process, you can use Copy/Paste (Ctrl+C/Ctrl+V) of weeks, workouts and exercises. There's also Undo/Redo (Ctrl+Z/Ctrl+Shift+Z) if you mess up. To share the workout, simply copy the URL from the browser.",
          order: 99,
          position: "center",
          offsetX: 0,
          offsetY: 0,
          rect: { left: 0, top: 0, width: 0, height: 0 },
        },
      }
    );
    const theHelps = CollectionUtils.sortBy(ObjectUtils.values(helpsMap), "order");
    setHelps(theHelps);
    if (typeof window !== "undefined") {
      const localStorageDisplayedStr = window.localStorage.getItem("liftosaur-builder-help-displayed");
      const localStorageDisplayed = localStorageDisplayedStr != null ? parseInt(localStorageDisplayedStr, 10) : 0;
      setDisplayed(localStorageDisplayed);
    }
  }, []);

  const help = helps[displayed];
  if (!help) {
    return null;
  }
  return (
    <div
      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-25"
      style={{ height: document.querySelector(".content")?.clientHeight }}
      onClick={() => {
        const newDisplayed = displayed + 1;
        setDisplayed(newDisplayed);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("liftosaur-builder-help-displayed", newDisplayed.toString());
        }
      }}
    >
      <div
        className={`box-content max-w-lg absolute flex items-center justify-center px-8 py-6 text-base font-semibold rounded-lg text-purplev2-200 bg-purplev2-main leading-6 shadow-md`}
        style={tooltipPosition(help)}
      >
        <div>{help.content}</div>
        {help.position !== "center" && (
          <div className="absolute" style={arrowPosition(help.position)}>
            <Arrow />
          </div>
        )}
      </div>
    </div>
  );
}

function Arrow(): JSX.Element {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 0L0 10H10H20L10 0Z" fill="#8356F6" />
    </svg>
  );
}

function tooltipPosition(help: IHelp): JSX.CSSProperties {
  const helpWidth = help.rect.width;
  const helpHeight = help.rect.height;
  const tooltipWidth = 240;
  const tooltipHeight = help.height;
  switch (help.position) {
    case "bottom": {
      const left = help.rect.left + helpWidth / 2 - tooltipWidth / 2 + help.offsetX;
      const top = help.rect.top + helpHeight + 20 + help.offsetY;
      const result = { left, top, width: tooltipWidth };
      return result;
    }
    case "top": {
      const left = help.rect.left + helpWidth / 2 - tooltipWidth / 2 + help.offsetX;
      const top = help.rect.top - 20 - (tooltipHeight || 150) - help.offsetY;
      const result = { left, top, width: tooltipWidth };
      return result;
    }
    case "center": {
      const left = "auto";
      const top = 300 + help.offsetY;
      const result = { left, top };
      return result;
    }
    default:
      return {};
  }
}

function arrowPosition(position: IPosition): JSX.CSSProperties {
  switch (position) {
    case "top":
      return {
        bottom: "-9px",
        left: "50%",
        marginLeft: "-10px",
        transform: "rotate(180deg)",
      };
    case "bottom":
      return {
        top: "-9px",
        left: "50%",
        marginLeft: "-10px",
      };
    case "left":
      return {
        top: "50%",
        left: "-9px",
        marginTop: "-10px",
        transform: "rotate(90deg)",
      };
    case "right":
      return {
        top: "50%",
        right: "-9px",
        marginTop: "-10px",
        transform: "rotate(-90deg)",
      };
    default:
      return {};
  }
}
