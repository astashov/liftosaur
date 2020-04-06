import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TimeUtils } from "../utils/time";
import { IWebpushr } from "../ducks/reducer";

interface IProps {
  timer: number;
  timerStart?: number;
  webpushr?: IWebpushr;
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
      if (timeDifference > props.timer && props.webpushr != null && !sentNotification.current) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        fetch(`https://server.liftosaur.workers.dev/timernotification?sid=${props.webpushr.sid}`, { method: "POST" });
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
    const className = timeDifference > props.timer ? "text-red-500" : "text-gray-200";
    return (
      <section className="w-full bg-gray-800 text-center col p-3">
        <span className={className}>{TimeUtils.formatMMSS(timeDifference)}</span>
      </section>
    );
  } else {
    return null;
  }
}
