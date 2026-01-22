import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TimeUtils } from "../utils/time";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { IconTrash } from "./icons/iconTrash";
import { IconBack } from "./icons/iconBack";
import { IHistoryRecord, ISettings, ISubscription } from "../types";
import { Reps } from "../models/set";
import { SendMessage } from "../utils/sendMessage";

interface IProps {
  progress: IHistoryRecord;
  dispatch: IDispatch;
  subscription: ISubscription;
  settings: ISettings;
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
      const timerMs = timer != null ? timer * 1000 : 0;
      // Only play notification if within 5 seconds of timer completion
      // This prevents repeated notifications when syncing from another device
      // where the timer may already be well past the threshold
      const maxNotificationWindowMs = 5000;
      if (
        timer != null &&
        timeDifference > timerMs &&
        timeDifference <= timerMs + maxNotificationWindowMs &&
        !sentNotification.current
      ) {
        if (!progress.ui?.nativeNotificationScheduled) {
          SendMessage.print(`Main app: Playing web app notification`);
          props.dispatch(Thunk.playAudioNotification());
        } else {
          SendMessage.print(`Main app: Not playing web app notification`);
        }
        sentNotification.current = true;
      } else if (timer != null && timeDifference > timerMs + maxNotificationWindowMs) {
        // Timer is past the window, mark as sent to prevent future plays
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
    const className = isTimeOut ? "bg-background-darkred" : "bg-background-darkgray";
    const totalColor = isTimeOut ? "text-white" : "text-gray-300";
    const nextEntryAndSetIndex =
      progress.timerEntryIndex != null && progress.timerMode != null
        ? Reps.findNextEntryAndSetIndex(progress, progress.timerEntryIndex, progress.timerMode)
        : undefined;
    return isExpanded ? (
      <div className="fixed z-30 safe-area-inset-bottom " style={{ left: "1rem", right: "1rem", bottom: "5rem" }}>
        <div
          className={`flex w-full ${className} text-center rounded-lg shadow-xl text-text-alwayswhite`}
          style={{ boxShadow: "0px 0px 8px rgb(0 0 0 / 25%);" }}
        >
          <button
            data-cy="rest-timer-minus"
            className="relative w-10 m-2 text-center nm-rest-timer-minus"
            style={{ minHeight: "2.5rem", userSelect: "none", touchAction: "manipulation" }}
            onClick={() =>
              props.dispatch(
                Thunk.updateTimer(timer - 15, nextEntryAndSetIndex?.entryIndex, nextEntryAndSetIndex?.setIndex, false)
              )
            }
          >
            <div className="absolute inset-0 rounded-lg bg-background-default" style={{ opacity: 0.2 }} />
            <span className="font-bold">-15s</span>
          </button>
          <button
            data-cy="rest-timer-cancel"
            className="relative w-10 my-2 text-center nm-rest-timer-cancel"
            style={{ minHeight: "2.5rem", userSelect: "none", touchAction: "manipulation" }}
            onClick={() => props.dispatch({ type: "StopTimer" })}
          >
            <div className="absolute inset-0 rounded-lg bg-background-default" style={{ opacity: 0.2 }} />
            <IconTrash color="white" style={{ display: "inline-block" }} />
          </button>
          <button
            data-cy="rest-timer-expanded"
            className="flex-1 nm-rest-timer-time"
            onClick={() => setIsExpanded(false)}
          >
            <span data-cy="rest-timer-current" className="font-bold text-text-alwayswhite">
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
            <div className="absolute inset-0 rounded-lg bg-background-default" style={{ opacity: 0.2 }} />
            <IconBack color="white" style={{ transform: "rotate(180deg)", display: "inline-block" }} />
          </button>
          <button
            data-cy="rest-timer-plus"
            className="relative w-10 m-2 text-center nm-rest-timer-plus"
            style={{ minHeight: "2.5rem", userSelect: "none", touchAction: "manipulation" }}
            onClick={() =>
              props.dispatch(
                Thunk.updateTimer(timer + 15, nextEntryAndSetIndex?.entryIndex, nextEntryAndSetIndex?.setIndex, false)
              )
            }
          >
            <div className="absolute inset-0 rounded-lg bg-background-default" style={{ opacity: 0.2 }} />
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
          <span data-cy="rest-timer-current" className="font-bold text-text-alwayswhite ">
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
