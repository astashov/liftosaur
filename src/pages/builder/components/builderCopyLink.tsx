import { h, JSX } from "preact";
import { IconLink } from "../../../components/icons/iconLink";
import { useState } from "preact/compat";
import { useEffect, useRef } from "preact/hooks";

export function BuilderCopyLink(): JSX.Element {
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const timeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (showInfo) {
      if (timeout.current) {
        window.clearTimeout(timeout.current);
      }
      timeout.current = window.setTimeout(() => {
        setShowInfo(false);
        timeout.current = undefined;
      }, 3000);
    }
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, [showInfo]);

  return (
    <span>
      {showInfo && <span className="mr-2 align-middle">Copied this workout link to clipboard</span>}
      <button
        className="p-2 align-middle"
        onClick={() => {
          navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
            if (result.state === "granted" || result.state === "prompt") {
              navigator.clipboard.writeText(window.location.href);
              setShowInfo(true);
            }
          });
        }}
      >
        <IconLink />
      </button>
    </span>
  );
}
