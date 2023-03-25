import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TimeUtils } from "../utils/time";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { IWebpushr } from "../models/state";

interface IProps {
  timer?: number;
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
      const timer = props.timer;
      if (timer != null && timeDifference > timer * 1000 && !sentNotification.current) {
        props.dispatch(Thunk.sendTimerPushNotification(props.webpushr?.sid));
        sentNotification.current = true;
      }
      if (prevProps.current.timerStart !== props.timerStart) {
        sentNotification.current = false;
      }
    }
    prevProps.current = props;
    return () => {
      if (intervalId != null) {
        window.clearInterval(intervalId.current);
      }
    };
  });

  const timer = props.timer;
  if (timer != null && props.timerStart != null) {
    const timeDifference = Date.now() - props.timerStart;
    const isTimeOut = timeDifference > timer * 1000;
    const className = isTimeOut ? "bg-redv2-main" : "bg-grayv2-main";
    const totalColor = isTimeOut ? "text-redv2-400" : "text-grayv2-300";
    return (
      <div className="fixed z-50 safe-area-inset-bottom " style={{ right: "1rem", bottom: "5rem" }}>
        <button
          onClick={() => {
            props.dispatch({ type: "StartProgramDayAction" });
          }}
          className={`${className} w-16 text-center px-2 py-2 rounded-lg shadow-xl`}
          style={{ boxShadow: "0px 0px 8px rgb(0 0 0 / 25%);" }}
        >
          <span className="font-bold text-white ">{TimeUtils.formatMMSS(timeDifference)}</span>
          <span className={`block text-xs ${totalColor}`}>{TimeUtils.formatMMSS(timer * 1000)}</span>
        </button>
      </div>
    );
  } else {
    return null;
  }
}
