import { h, JSX, Fragment } from "preact";

export function HelpTimers(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Settings - Timers</h2>
      <p className="pb-2">You can specify warmup and regular workout timers here.</p>
      <p className="pb-2">
        Warmup timer is fired after finishing a warmup set, and regular workout timer - after finishing a regular set.
      </p>
      <p className="pb-2">
        You'll see the timer on the workout screen. When it times out on Android, it will make a sound and send a
        notification. Unfortunately, we don't support the sound/notification on iOS yet.
      </p>
    </>
  );
}
