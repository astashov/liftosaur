import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { Button } from "./button";
import { updateSettings } from "../models/state";
import { ISettings } from "../types";
import { Thunk } from "../ducks/thunks";
import { lb } from "lens-shmens";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
}

export function ScreenUnitSelector(props: IProps): JSX.Element {
  const selectedButtonCls = "text-white bg-purplev3-main border-purplev3-main";
  const unselectedButtonCls = "text-purplev3-main bg-white border-grayv3-200";
  return (
    <section className="flex flex-col h-screen text-blackv2">
      <div className="flex-1 px-4 pt-16 pb-4">
        <div className="w-full h-full border border-grayv3-200 rounded-2xl bg-grayv3-50">
          <div className="px-6 pt-16 text-2xl font-semibold text-center">Pick your units</div>
          <div className="px-6 py-4 text-base text-center">
            Your chosen units will be the default, but you can override them or change them in Settings or per equipment
            anytime.
          </div>
          <div className="flex px-6">
            <button
              className={`flex-1 px-2 py-3 font-semibold text-center border rounded-tl-lg rounded-bl-lg text-sm ${props.settings.units === "lb" ? selectedButtonCls : unselectedButtonCls}`}
              onClick={() => {
                updateSettings(props.dispatch, lb<ISettings>().p("units").record("lb"));
              }}
            >
              Pounds (lb)
            </button>
            <button
              className={`flex-1 px-2 py-3 font-semibold text-center border rounded-tr-lg rounded-br-lg text-sm ${props.settings.units === "kg" ? selectedButtonCls : unselectedButtonCls}`}
              onClick={() => {
                updateSettings(props.dispatch, lb<ISettings>().p("units").record("kg"));
              }}
            >
              Kilograms (kg)
            </button>
          </div>
        </div>
      </div>
      <div className="safe-area-inset-bottom">
        <div className="pb-16 mx-4 mb-2 text-center">
          <div>
            <Button
              className="w-full"
              name="see-how-it-works"
              kind="purple"
              onClick={() => props.dispatch(Thunk.pushScreen("programs"))}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
