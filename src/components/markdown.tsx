import { h, JSX } from "preact";
import micromark from "micromark";
import gfm from "micromark-extension-gfm";
import gfmHtml from "micromark-extension-gfm/html";
import { useEffect, useRef, useState } from "preact/hooks";
import { LinkButton } from "./linkButton";

interface IProps {
  value: string;
  className?: string;
  truncate?: number;
}

export function Markdown(props: IProps): JSX.Element {
  const [shouldTruncate, setShouldTruncate] = useState(props.truncate != null);
  const [isTruncated, setIsTruncated] = useState(props.truncate != null);
  const result = micromark(props.value, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml],
  });
  let className = props.className || "markdown";
  if (isTruncated && props.className?.indexOf("line-clamp") === -1) {
    className += ` line-clamp-${props.truncate}`;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (isTruncated) {
      setShouldTruncate(container.scrollHeight > container.clientHeight);
    }
    if (container) {
      for (const element of Array.from(container.querySelectorAll("a"))) {
        element.setAttribute("target", "_blank");
      }
    }
  });

  return (
    <div>
      <div ref={containerRef} className={className} dangerouslySetInnerHTML={{ __html: result }} />
      {shouldTruncate && props.truncate != null && (
        <div className="leading-none" style={{ marginTop: "-0.125rem" }}>
          <LinkButton
            name="truncate-markdown"
            className="text-xs font-normal"
            onClick={() => setIsTruncated(!isTruncated)}
          >
            {isTruncated ? "Show more" : "Show less"}
          </LinkButton>
        </div>
      )}
    </div>
  );
}
