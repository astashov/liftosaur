import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TimeUtils } from "../utils/time";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { IWebpushr } from "../models/state";
import { ISettingsTimers, IProgressMode } from "../types";

interface IProps {
  timers: ISettingsTimers;
  mode: IProgressMode;
  timerStart?: number;
  webpushr?: IWebpushr;
  dispatch: IDispatch;
}

export function RestTimer(props: IProps): JSX.Element | null {
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
      if (timer != null && timeDifference > timer * 1000 && !sentNotification.current) {
        props.dispatch(Thunk.sendTimerPushNotification(props.webpushr?.sid));
        sentNotification.current = true;
      }
      if (prevProps.current.timerStart !== props.timerStart) {
        sentNotification.current = false;
      }
    }
    prevProps.current = props;
  });

  const timer = props.timers[props.mode];
  if (timer != null && props.timerStart != null) {
    const timeDifference = Date.now() - props.timerStart;
    const isTimeOut = timeDifference > timer * 1000;
    const className = isTimeOut ? "text-red-500" : "text-gray-200";
    return (
      <section className="col fixed w-full p-3 text-center bg-gray-800" style={{ bottom: "4rem" }}>
        <span className={className}>
          {TimeUtils.formatMMSS(timeDifference)}
          {isTimeOut ? " - Time to start next set!" : ""}
        </span>
      </section>
    );
  } else {
    return null;
  }
}
