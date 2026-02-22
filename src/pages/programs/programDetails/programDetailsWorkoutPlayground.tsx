import { h, JSX } from "preact";
import { memo, useCallback, useEffect, useRef, useState } from "preact/compat";
import { IProgram, ISettings, IUnit } from "../../../types";
import { MenuItemValue } from "../../../components/menuItemEditable";
import { ProgramPreviewPlayground } from "../../../components/preview/programPreviewPlayground";
import { Stats } from "../../../models/stats";
import { track } from "../../../utils/posthog";
import { ProgramDetailsLiftoscript } from "./programDetailsLiftoscript";
import { IconArrowRight } from "../../../components/icons/iconArrowRight";

type ITab = "preview" | "playground" | "liftoscript";

interface IPlaygroundProps {
  program: IProgram;
  settings: ISettings;
  maxWidth?: number;
}

export const ProgramDetailsWorkoutPlayground = memo((props: IPlaygroundProps): JSX.Element => {
  const [units, setUnits] = useState<IUnit>("lb");
  const [tab, setTab] = useState<ITab>("preview");
  const [weeksAsTabs, setWeeksAsTabs] = useState(false);
  const settings = { ...props.settings, units };
  const maxWidth = props.maxWidth;
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = containerRef.current?.querySelector(".preview-all-weeks-scroll");
    if (!el) {
      return;
    }
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = containerRef.current?.querySelector(".preview-all-weeks-scroll");
    if (!el) {
      return;
    }
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    updateScrollState();
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, weeksAsTabs]);

  const scrollBy = useCallback((direction: 1 | -1) => {
    const el = containerRef.current?.querySelector(".preview-all-weeks-scroll");
    if (!el) {
      return;
    }
    const firstCol = el.querySelector(".preview-all-weeks-grid > div") as HTMLElement | null;
    if (!firstCol) {
      return;
    }
    const gap = 16;
    const colWidth = firstCol.offsetWidth + gap;
    el.scrollBy({ left: direction * colWidth, behavior: "smooth" });
  }, []);

  return (
    <div>
      <div
        className="flex flex-wrap items-center justify-center mx-auto border-b md:justify-start border-border-neutral"
        style={{ gap: "0.5rem", maxWidth }}
      >
        <div className="flex" style={{ gap: "2px" }}>
          {(["preview", "liftoscript", "playground"] as const).map((t) => (
            <button
              className={`px-3 py-1 rounded-md transition-colors ${
                tab === t
                  ? "bg-white text-text-purple border-b brder-border-purple"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "preview" ? "Preview" : t === "playground" ? "Playground" : "Liftoscript"}
            </button>
          ))}
        </div>
        {tab !== "liftoscript" && (
          <div className="hidden ml-auto md:block">
            <UnitSwitcher currentUnit={units} onUnitChange={(newUnit) => setUnits(newUnit)} />
          </div>
        )}
      </div>
      {tab !== "liftoscript" && (
        <div className="block mx-auto mt-1 text-center md:hidden">
          <UnitSwitcher currentUnit={units} onUnitChange={(newUnit) => setUnits(newUnit)} />
        </div>
      )}
      <div ref={containerRef} style={{ display: tab === "preview" ? "block" : "none" }}>
        <div className="flex items-center mx-auto mt-2 mb-4 text-sm text-text-secondary" style={{ maxWidth }}>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              className="checkbox"
              id="weeksAsTabs"
              checked={weeksAsTabs}
              onChange={() => setWeeksAsTabs((v) => !v)}
            />
            <span>Show weeks as tabs</span>
          </label>
          {!weeksAsTabs && (
            <div className="flex gap-2 ml-auto">
              <button
                className="flex items-center justify-center w-8 h-8 transition-colors border rounded-full border-border-prominent hover:bg-gray-100 active:bg-gray-200"
                style={{ opacity: canScrollLeft ? 1 : 0.3, cursor: canScrollLeft ? "pointer" : "default" }}
                onClick={() => scrollBy(-1)}
                disabled={!canScrollLeft}
              >
                <IconArrowRight style={{ transform: "rotate(180deg)" }} />
              </button>
              <button
                className="flex items-center justify-center w-8 h-8 transition-colors border rounded-full border-border-prominent hover:bg-gray-100 active:bg-gray-200"
                style={{ opacity: canScrollRight ? 1 : 0.3, cursor: canScrollRight ? "pointer" : "default" }}
                onClick={() => scrollBy(1)}
                disabled={!canScrollRight}
              >
                <IconArrowRight />
              </button>
            </div>
          )}
        </div>

        <div style={{ maxWidth: weeksAsTabs ? maxWidth : undefined }} className="mx-auto">
          <ProgramPreviewPlayground
            showAllWeeks={!weeksAsTabs}
            key={`preview-${units}`}
            program={props.program}
            stats={Stats.getEmpty()}
            settings={settings}
            isPlayground={false}
            onEngage={() => {
              track({ name: "details_preview" });
            }}
          />
        </div>
      </div>
      <div className="mx-auto mt-2" style={{ display: tab === "liftoscript" ? "block" : "none", maxWidth }}>
        <ProgramDetailsLiftoscript program={props.program} />
      </div>
      <div className="mx-auto" style={{ display: tab === "playground" ? "block" : "none", maxWidth }}>
        <p className="mx-auto mt-4 mb-4 text-sm text-text-secondary" style={{ maxWidth }}>
          Enter reps and weight for each set, then tap the checkmark to complete it. Finish the workout day and see how
          the program adjusts weights, reps, and sets for next time.
        </p>
        <ProgramPreviewPlayground
          key={`playground-${units}`}
          program={props.program}
          stats={Stats.getEmpty()}
          settings={settings}
          isPlayground={true}
          onEngage={() => {
            track({ name: "details_playground" });
          }}
        />
      </div>
    </div>
  );
});

function UnitSwitcher(props: { currentUnit: IUnit; onUnitChange: (newUnit: IUnit) => void }): JSX.Element {
  return (
    <label className="ml-auto">
      <span className="mr-2 text-sm font-semibold">Units:</span>
      <MenuItemValue
        name="Unit"
        setPatternError={() => undefined}
        type="desktop-select"
        value={props.currentUnit}
        values={[
          ["lb", "lb"],
          ["kg", "kg"],
        ]}
        onChange={(newValue) => {
          if (newValue) {
            props.onUnitChange(newValue as IUnit);
          }
        }}
      />
    </label>
  );
}
