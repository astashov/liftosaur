import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TimeUtils } from "../utils/time";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { IState, updateState } from "../models/state";
import { IconTrash } from "./icons/iconTrash";
import { IconBack } from "./icons/iconBack";
import { lb } from "lens-shmens";
import { SendMessage } from "../utils/sendMessage";
import { IHistoryRecord } from "../types";

interface IProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
}

function updateTimer(dispatch: IDispatch, progress: IHistoryRecord, newTimer: number, timerSince: number): void {
  const timerForPush = newTimer - Math.round((Date.now() - timerSince) / 1000);
  if (timerForPush > 0) {
    dispatch({
      type: "StartTimer",
      entryIndex: progress.timerEntryIndex || 0,
      setIndex: progress.timerSetIndex || 0,
      mode: progress.timerMode || "workout",
      timestamp: progress.timerSince || Date.now(),
      timer: newTimer,
    });
  } else {
    SendMessage.toIos({ type: "stopTimer" });
    SendMessage.toAndroid({ type: "stopTimer" });
    updateState(dispatch, [lb<IState>().p("progress").pi(progress.id).p("timer").record(newTimer)]);
  }
}

export function RestTimer(props: IProps): JSX.Element | null {
  const prevProps = useRef<IProps>(props);
  const sentNotification = useRef<boolean>(false);
  const intervalId = useRef<number | undefined>(undefined);
  const [tick, setTick] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const { progress } = props;
  const { timer, timerSince } = progress;

  useEffect(() => {
    if (timerSince != null) {
      if (intervalId != null) {
        window.clearInterval(intervalId.current);
      }
      intervalId.current = window.setInterval(() => {
        setTick(tick + 1);
      }, 1000);
      const timeDifference = Date.now() - timerSince;
      if (timer != null && timeDifference > timer * 1000 && !sentNotification.current) {
        props.dispatch(Thunk.playAudioNotification());
        sentNotification.current = true;
      }
      if (prevProps.current.progress.timerSince !== props.progress.timerSince) {
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

  if (timer != null && timerSince != null) {
    const timeDifference = Date.now() - timerSince;
    const isTimeOut = timeDifference > timer * 1000;
    const className = isTimeOut ? "bg-redv2-main" : "bg-grayv2-main";
    const totalColor = isTimeOut ? "text-redv2-400" : "text-grayv2-300";
    return isExpanded ? (
      <div className="fixed z-30 safe-area-inset-bottom " style={{ left: "1rem", right: "1rem", bottom: "5rem" }}>
        <div
          className={`flex w-full ${className} text-center rounded-lg shadow-xl text-white`}
          style={{ boxShadow: "0px 0px 8px rgb(0 0 0 / 25%);" }}
        >
          <button
            data-cy="rest-timer-minus"
            className="relative w-10 m-2 text-center nm-rest-timer-minus"
            style={{ minHeight: "2.5rem", userSelect: "none", touchAction: "manipulation" }}
            onClick={() => updateTimer(props.dispatch, progress, timer - 15, timerSince)}
          >
            <div className="absolute inset-0 bg-white rounded-lg" style={{ opacity: 0.2 }} />
            <span className="font-bold">-15s</span>
          </button>
          <button
            data-cy="rest-timer-cancel"
            className="relative w-10 my-2 text-center nm-rest-timer-cancel"
            style={{ minHeight: "2.5rem", userSelect: "none", touchAction: "manipulation" }}
            onClick={() => props.dispatch({ type: "StopTimer" })}
          >
            <div className="absolute inset-0 bg-white rounded-lg" style={{ opacity: 0.2 }} />
            <IconTrash color="white" style={{ display: "inline-block" }} />
          </button>
          <button
            data-cy="rest-timer-expanded"
            className="flex-1 nm-rest-timer-time"
            onClick={() => setIsExpanded(false)}
          >
            <span data-cy="rest-timer-current" className="font-bold text-white">
              {TimeUtils.formatMMSS(timeDifference)}
            </span>
            <span data-cy="rest-timer-total" className={`block text-xs ${totalColor}`}>
              {TimeUtils.formatMMSS(timer * 1000)}
            </span>
          </button>
          <button
            data-cy="rest-timer-back"
            className="relative w-10 my-2 text-center nm-rest-timer-back"
            style={{ minHeight: "2.5rem", userSelect: "none", touchAction: "manipulation" }}
            onClick={() => setIsExpanded(false)}
          >
            <div className="absolute inset-0 bg-white rounded-lg" style={{ opacity: 0.2 }} />
            <IconBack color="white" style={{ transform: "rotate(180deg)", display: "inline-block" }} />
          </button>
          <button
            data-cy="rest-timer-plus"
            className="relative w-10 m-2 text-center nm-rest-timer-plus"
            style={{ minHeight: "2.5rem", userSelect: "none", touchAction: "manipulation" }}
            onClick={() => updateTimer(props.dispatch, progress, timer + 15, timerSince)}
          >
            <div className="absolute inset-0 bg-white rounded-lg" style={{ opacity: 0.2 }} />
            <span className="font-bold">+15s</span>
          </button>
        </div>
      </div>
    ) : (
      <div className="fixed z-30 safe-area-inset-bottom " style={{ right: "1rem", bottom: "5rem" }}>
        <button
          data-cy="rest-timer-collapsed"
          onClick={() => setIsExpanded(true)}
          className={`${className} w-16 text-center px-2 py-2 rounded-lg shadow-xl`}
          style={{ boxShadow: "0px 0px 8px rgb(0 0 0 / 25%);" }}
        >
          <span data-cy="rest-timer-current" className="font-bold text-white ">
            {TimeUtils.formatMMSS(timeDifference)}
          </span>
          <span data-cy="rest-timer-total" className={`block text-xs ${totalColor}`}>
            {TimeUtils.formatMMSS(timer * 1000)}
          </span>
        </button>
      </div>
    );
  } else {
    return null;
  }
}
