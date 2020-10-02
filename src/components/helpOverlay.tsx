import { JSX } from "preact";

import { h } from "preact";
import { useRef, useEffect, useState } from "preact/hooks";
import { ObjectUtils } from "../utils/object";
import { Button } from "./button";
import { Help } from "../models/help";
import { IDispatch } from "../ducks/types";

interface IRect {
  x: number;
  y: number;
  w: number;
  h: number;
  text: IRectText;
}

interface IRectText {
  content: string;
  offsetX: number;
  width?: number;
}

interface IProps {
  seenIds: string[];
  dispatch: IDispatch;
}

export function HelpOverlay(props: IProps): JSX.Element | null {
  const seenIds: string[] = props.seenIds;
  const svgEl = useRef<SVGSVGElement | undefined>();
  const width = useRef<number | undefined>();
  const height = useRef<number | undefined>();

  const [windows, setWindows] = useState<Partial<Record<string, IRect>>>({});

  useEffect(() => {
    let isChanged = false;
    if (width.current == null && svgEl.current?.clientWidth != null) {
      width.current = svgEl.current.clientWidth;
      isChanged = true;
    }
    if (height.current == null && svgEl.current?.clientWidth != null) {
      height.current = svgEl.current.clientHeight;
      isChanged = true;
    }
    const elements = Array.from(document.querySelectorAll("[data-help-id]"));
    const rects: Partial<Record<string, IRect>> = {};
    for (const e of elements) {
      const id = e.getAttribute("data-help-id")!;
      const text = {
        content: e.getAttribute("data-help")!,
        offsetX: e.getAttribute("data-help-offset-x") ? parseInt(e.getAttribute("data-help-offset-x")!, 10) : 0,
        width: e.getAttribute("data-help-width") ? parseInt(e.getAttribute("data-help-width")!, 10) : undefined,
      };
      if (seenIds.indexOf(id) === -1) {
        const rect = e.getBoundingClientRect();
        rects[id] = { x: rect.left - 4, y: rect.top - 4, w: rect.width + 8, h: rect.height + 8, text };
      }
    }
    isChanged =
      isChanged ||
      ObjectUtils.keys(windows).length !== ObjectUtils.keys(rects).length ||
      ObjectUtils.keys(windows).some((k) => {
        const a = windows[k];
        const b = rects[k];
        return a?.w !== b?.w || a?.h !== b?.h || a?.x !== b?.x || a?.y !== b?.y;
      });
    if (isChanged) {
      setWindows(rects);
    }
  });

  const wt = width.current || 0;
  const ht = height.current || 0;

  let path = `M 0 0 l${wt} 0 0 ${ht} -${wt} 0Z`;
  ObjectUtils.keys(windows).map((key) => {
    const rect = windows[key]!;
    path += `M ${rect.x} ${rect.y}l${rect.w} 0 0 ${rect.h} -${rect.w} 0Z`;
  });

  if (ObjectUtils.keys(windows).length < 1) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 z-30 w-full h-full" id="help-overlay">
      <svg ref={svgEl} className="absolute top-0 left-0 w-full h-full" viewBox={`0 0 ${wt} ${ht}`}>
        <clipPath id="windows">
          <path d={path} clip-rule="evenodd" />
        </clipPath>
        <rect
          clip-path="url(#windows)"
          x="0"
          y="0"
          width={width.current || 0}
          height={height.current || 0}
          fill="rgba(26, 32, 44, 0.8)"
        />
      </svg>
      {ObjectUtils.keys(windows).map((key) => {
        const rect = windows[key]!;
        return (
          <div
            className="absolute text-sm italic text-white"
            style={{ top: rect.y + rect.h, left: rect.x + rect.text.offsetX, width: rect.text.width || "auto" }}
          >
            {rect.text.content}
          </div>
        );
      })}
      <div className="absolute bottom-0 left-0 w-full mb-6 text-center">
        <Button
          kind="green"
          onClick={() => {
            Help.markSeen(props.dispatch, ObjectUtils.keys(windows));
          }}
        >
          Got it!
        </Button>
      </div>
    </div>
  );
}
