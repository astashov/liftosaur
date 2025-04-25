import { h, JSX, Fragment } from "preact";
import { IconArrowDown3 } from "./icons/iconArrowDown3";
import { ImagePreloader } from "../utils/imagePreloader";

export function HistoryRecordsNullState(): JSX.Element {
  return (
    <>
      <div className="absolute flex items-center justify-center" style={{ top: 130, left: 0, right: 0 }}>
        <div>
          <img src={ImagePreloader.dynocoach} className="block" style={{ width: 188, height: 240 }} />
        </div>
      </div>
      <div className="fixed bottom-0 left-0 w-full py-4 pb-20 text-center border border-purple-300 bg-purplev3-50 rounded-2xl">
        <div className="safe-area-inset-bottom">
          <h3 className="py-2 font-semibold">Welcome to Liftosaur!</h3>
          <div className="text-sm">Tap here to start a workout</div>
          <div className="py-2">
            <IconArrowDown3 className="inline-block" />
          </div>
        </div>
      </div>
    </>
  );
}
