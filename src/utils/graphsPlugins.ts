import UPlot from "uplot";
import { Tailwind_semantic } from "./tailwindConfig";

interface IFromTo {
  x: number;
  y: number;
  dx: number;
  dy: number;
  d: number;
}

export function GraphsPlugins_zoom(): UPlot.Plugin {
  function init(u: uPlot): void {
    const over = u.over;
    let rect: { left: number; top: number; width: number; height: number };
    let oxRange: number;
    let xVal: number;
    let fr: IFromTo = { x: 0, y: 0, dx: 0, dy: 0, d: 0 };
    let to: IFromTo = { x: 0, y: 0, dx: 0, dy: 0, d: 0 };

    function getPos(e: TouchEvent): IFromTo {
      const t = { x: 0, y: 0, dx: 0, dy: 0, d: 0 };
      const ts = e.touches;

      const t0 = ts[0];
      const t0x = t0.clientX - rect.left;
      const t0y = t0.clientY - rect.top;

      if (ts.length === 1) {
        t.x = t0x;
        t.y = t0y;
        t.d = t.dx = t.dy = 1;
      } else {
        const t1 = e.touches[1];
        const t1x = t1.clientX - rect.left;
        const t1y = t1.clientY - rect.top;

        const xMin = Math.min(t0x, t1x);
        const yMin = Math.min(t0y, t1y);
        const xMax = Math.max(t0x, t1x);
        const yMax = Math.max(t0y, t1y);

        // midpts
        t.y = (yMin + yMax) / 2;
        t.x = (xMin + xMax) / 2;

        t.dx = xMax - xMin;
        t.dy = yMax - yMin;

        // dist
        t.d = Math.sqrt(t.dx * t.dx + t.dy * t.dy);
      }
      return t;
    }

    let rafPending = false;

    function zoom(): void {
      rafPending = false;

      const left = to.x;

      // non-uniform scaling
      const xFactor = fr.dx / to.dx;

      const leftPct = left / rect.width;

      const nxRange = oxRange * xFactor;
      const nxMin = xVal - leftPct * nxRange;
      const nxMax = nxMin + nxRange;

      u.batch(() => {
        u.setScale("x", {
          min: nxMin,
          max: nxMax,
        });
      });
    }

    function track(): void {
      rafPending = false;

      const left = to.x;
      const top = to.y;

      u.setCursor({ left, top }, true);
    }

    function touchmove(e: TouchEvent): void {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
      to = getPos(e);

      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(e.touches.length > 1 ? zoom : track);
      }
    }

    over.addEventListener("touchstart", function (e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
      rect = over.getBoundingClientRect();
      fr = getPos(e);

      oxRange = (u.scales.x.max || 0) - (u.scales.x.min || 0);

      const left = fr.x;
      xVal = u.posToVal(left, "x");

      document.addEventListener("touchmove", touchmove, { passive: false });
    });

    over.addEventListener("touchend", function (e) {
      document.removeEventListener("touchmove", touchmove);
    });
  }

  return {
    hooks: {
      init,
    },
  };
}

export function GraphsPlugins_programLines(programTimes: [number, string][]): UPlot.Plugin {
  return {
    hooks: {
      draw: [
        (self: UPlot): void => {
          let programsOverlay: HTMLElement | null = self.over.querySelector(".programs-overlay");
          if (programsOverlay == null) {
            programsOverlay = document.createElement("div") as HTMLElement;
            programsOverlay.classList.add("programs-overlay");
            programsOverlay.style.position = "absolute";
            programsOverlay.style.top = "0";
            programsOverlay.style.left = "0";
            programsOverlay.style.bottom = "0";
            programsOverlay.style.right = "0";
            self.over.appendChild(programsOverlay);
          }
          programsOverlay.innerHTML = "";
          const lineColor = Tailwind_semantic().border.neutral;
          const textColor = Tailwind_semantic().text.secondary;
          const changeProgramPos = programTimes.map<[number, string]>((i) => [self.valToPos(i[0], "x"), i[1]]);
          for (let i = 0; i < changeProgramPos.length; i += 1) {
            const [pos, programName] = changeProgramPos[i];
            if (pos > 0 && pos < self.over.clientWidth) {
              const posEl = document.createElement("div");
              posEl.style.position = "absolute";
              posEl.style.top = "0";
              posEl.style.bottom = "0";
              posEl.style.left = `${pos}px`;
              posEl.style.width = `1px`;
              posEl.style.backgroundColor = lineColor;
              programsOverlay.appendChild(posEl);

              const shouldShiftRight = pos < 15;
              const neighborPos = shouldShiftRight ? changeProgramPos[i + 1] : changeProgramPos[i - 1];
              if (neighborPos == null || Math.abs(neighborPos[0] - pos) > 15) {
                const textEl = document.createElement("div");
                textEl.textContent = programName;
                textEl.style.position = "absolute";
                textEl.style.top = shouldShiftRight ? "-15px" : "0";
                textEl.style.left = `${pos}px`;
                textEl.style.fontSize = "10px";
                textEl.style.color = textColor;
                textEl.style.transform = "rotate(90deg)";
                textEl.style.transformOrigin = shouldShiftRight ? "0 100%" : "0 0";
                textEl.style.whiteSpace = "nowrap";
                programsOverlay.appendChild(textEl);
              }
            }
          }
        },
      ],
    },
  };
}
