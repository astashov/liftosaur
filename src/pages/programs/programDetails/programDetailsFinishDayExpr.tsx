import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { useRef, useState } from "preact/hooks";
import Prism from "prismjs";

export const FinishDayExprView = memo(
  (props: { finishDayExpr: string; shouldShowAllScripts: boolean }): JSX.Element | null => {
    const [isVisible, setIsVisible] = useState(props.shouldShowAllScripts);
    const codeRef = useRef<HTMLElement>();
    const highlightedCode = Prism.highlight(props.finishDayExpr, Prism.languages.javascript, "javascript");
    if (!props.finishDayExpr) {
      return null;
    }

    return (
      <div className="pt-2">
        <span className="text-sm italic">Finish Day Script: </span>
        <div className={isVisible ? "block" : "hidden"}>
          <pre className={`text-sm overflow-auto ${isVisible ? "block" : "hidden"}`}>
            <code
              ref={codeRef}
              class="block code language-javascript"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
        <button
          className="text-sm text-blue-700 underline nm-program-details-finish-day-script-toggle"
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>
    );
  }
);
