import { h, JSX } from "preact";
import { IconArrowDown3 } from "./icons/iconArrowDown3";

export function HistoryRecordsNullState(): JSX.Element {
  return (
    <div className="fixed bottom-0 left-0 w-full py-8 pb-20 text-center border border-purple-300 bg-purplev3-50 rounded-2xl">
      <img src="/images/dyno-smile.png" className="inline" style={{ width: 51, height: 51 }} />
      <h3 className="py-2 font-semibold">Welcome to Liftosaur!</h3>
      <div className="text-sm">Tap here to start a workout</div>
      <div className="py-2">
        <IconArrowDown3 className="inline-block" />
      </div>
    </div>
  );
}
