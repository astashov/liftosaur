import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TimeUtils } from "../utils/time";

interface IProps {
  timerStart?: number;
}

export function Timer(props: IProps): JSX.Element | null {
  const intervalId = useRef<number | undefined>(undefined);
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    if (props.timerStart != null) {
      if (intervalId != null) {
        window.clearInterval(intervalId.current);
      }
      intervalId.current = window.setInterval(() => {
        setTick(tick + 1);
      }, 1000);
    }
    if (props.timerStart != null) {
      const timeDifference = Date.now() - props.timerStart;
      if (timeDifference > 3000) {
        console.log("Fire reminder");
      }
    }
  });

  if (props.timerStart != null) {
    const timeDifference = Date.now() - props.timerStart;
    return (
      <section className="w-full bg-gray-800 text-center col text-gray-200 p-3">
        {TimeUtils.formatMMSS(timeDifference)}
      </section>
    );
  } else {
    return null;
  }
}
