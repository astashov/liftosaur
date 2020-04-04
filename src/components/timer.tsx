import { h, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { TimeUtils } from "../utils/time";
import { IWebpushr } from "../ducks/reducer";

interface IProps {
  timerStart?: number;
  webpushr?: IWebpushr;
}

export function Timer(props: IProps): JSX.Element | null {
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
    }
    if (props.timerStart != null) {
      const timeDifference = Date.now() - props.timerStart;
      if (timeDifference > 3000 && props.webpushr != null && !sentNotification.current) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        fetch(`https://server.liftosaur.workers.dev/timernotification?sid=${props.webpushr.sid}`, { method: "POST" });
        sentNotification.current = true;
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
