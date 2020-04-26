import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TimeUtils } from "../utils/time";
import { IWebpushr } from "../ducks/reducer";
import { IProgressMode } from "../models/progress";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";

interface IProps {
  timers: {
    warmup: number;
    workout: number;
  };
  mode: IProgressMode;
  timerStart?: number;
  webpushr?: IWebpushr;
  dispatch: IDispatch;
}

export function Timer(props: IProps): JSX.Element | null {
  const prevProps = useRef<IProps>(props);
  const sentNotification = useRef<boolean>(false);
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
      const timeDifference = Date.now() - props.timerStart;
      const timer = props.timers[props.mode];
      if (timeDifference > timer * 1000 && !sentNotification.current) {
        props.dispatch(Thunk.sendTimerPushNotification(props.webpushr?.sid));
        sentNotification.current = true;
      }
      if (prevProps.current.timerStart !== props.timerStart) {
        sentNotification.current = false;
      }
    }
    prevProps.current = props;
  });

  if (props.timerStart != null) {
    const timeDifference = Date.now() - props.timerStart;
    const timer = props.timers[props.mode];
    const className = timeDifference > timer * 1000 ? "text-red-500" : "text-gray-200";
    return (
      <section className="w-full p-3 text-center bg-gray-800 col">
        <span className={className}>{TimeUtils.formatMMSS(timeDifference)}</span>
      </section>
    );
  } else {
    return null;
  }
}
