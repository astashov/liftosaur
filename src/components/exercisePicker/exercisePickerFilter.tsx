import { h, JSX } from "preact";
import { ISettings } from "../../types";
import { IconBack } from "../icons/iconBack";

interface IProps {
  settings: ISettings;
  onPullScreen: () => void;
}

export function ExercisePickerFilter(props: IProps): JSX.Element {
  return (
    <div className="flex flex-col h-full" style={{ marginTop: "-0.75rem" }}>
      <div className="flex-1 overflow-y-auto">
        <div className="relative py-4 mt-2">
          <div className="absolute flex top-2 left-4">
            <div>
              <button className="p-2 nm-back" data-cy="navbar-back" onClick={() => props.onPullScreen()}>
                <IconBack />
              </button>
            </div>
          </div>
          <h3 className="px-4 font-bold text-center">Filter and sort</h3>
        </div>
      </div>
    </div>
  );
}
