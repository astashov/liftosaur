import React, { JSX } from "react";
import micromark from "micromark";
import gfm from "micromark-extension-gfm";
import gfmHtml from "micromark-extension-gfm/html";
import { useEffect, useRef } from "react";

interface IProps {
  value: string;
  className?: string;
}

export function Markdown(props: IProps): JSX.Element {
  const result = micromark(props.value, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml],
  });
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      for (const element of Array.from(container.querySelectorAll("a"))) {
        element.setAttribute("target", "_blank");
      }
    }
  });

  return (
    <div ref={containerRef} className={props.className || "markdown"} dangerouslySetInnerHTML={{ __html: result }} />
  );
}
