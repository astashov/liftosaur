import UPlot from "uplot";

interface IFromTo {
  x: number;
  y: number;
  dx: number;
  dy: number;
  d: number;
}

export class GraphsPlugins {
  public static zoom(): UPlot.Plugin {
    function init(u: uPlot, opts: UPlot.Options, data: UPlot.AlignedData): void {
      console.log("init");
      const over = u.over;
      let rect: { left: number; top: number; width: number; height: number };
      let oxRange: number;
      let oyRange: number;
      let xVal: number;
      let yVal: number;
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
          console.log("Prevent default");
          e.preventDefault();
        }
        to = getPos(e);
        console.log("to", to);

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
        console.log("fr", fr);

        oxRange = (u.scales.x.max || 0) - (u.scales.x.min || 0);
        oyRange = (u.scales.y.max || 0) - (u.scales.y.min || 0);
        console.log("oxRange", oxRange);
        console.log("oyRange", oyRange);

        const left = fr.x;
        const top = fr.y;

        xVal = u.posToVal(left, "x");
        yVal = u.posToVal(top, "y");
        console.log("xVal", xVal);
        console.log("yVal", yVal);

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
}
