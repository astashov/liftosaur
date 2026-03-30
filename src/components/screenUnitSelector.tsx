import type { JSX } from "react";
import { IDispatch } from "../ducks/types";
import { Button } from "./button";
import { updateSettings } from "../models/state";
import { ISettings } from "../types";
import { Thunk_pushScreen } from "../ducks/thunks";
import { lb } from "lens-shmens";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
}

export function ScreenUnitSelector(props: IProps): JSX.Element {
  const selectedButtonCls = "text-button-primarylabel bg-button-primarybackground border-button-primarybackground";
  const unselectedButtonCls = "text-text-purple bg-background-default border-border-neutral";
  return (
    <section className="flex flex-col h-screen text-text-primary bg-background-default">
      <div className="flex-1 px-4 pt-16 pb-4">
        <div className="w-full h-full border border-border-cardyellow rounded-2xl bg-background-cardyellow">
          <div className="p-4 text-center">
            <img
              src="/images/dinounit.png"
              className="inline-block object-cover h-48 rounded-t-2xl"
              alt="Dino choosing a unit"
            />
          </div>
          <div className="px-6 pt-4 text-2xl font-semibold text-center">Pick your units</div>
          <div className="px-6 py-4 text-base text-center">
            Your chosen units will be the default, but you can override them or change them in <strong>Settings</strong>{" "}
            or <strong>per equipment</strong>
            anytime.
          </div>
          <div className="flex px-6">
            <button
              className={`flex-1 px-2 py-3 font-semibold text-center border rounded-tl-lg rounded-bl-lg text-sm ${props.settings.units === "lb" ? selectedButtonCls : unselectedButtonCls}`}
              onClick={() => {
                updateSettings(props.dispatch, lb<ISettings>().p("units").record("lb"), "Set units to pounds");
              }}
            >
              Pounds (lb)
            </button>
            <button
              className={`flex-1 px-2 py-3 font-semibold text-center border rounded-tr-lg rounded-br-lg text-sm ${props.settings.units === "kg" ? selectedButtonCls : unselectedButtonCls}`}
              onClick={() => {
                updateSettings(props.dispatch, lb<ISettings>().p("units").record("kg"), "Set units to kilograms");
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
              onClick={() => props.dispatch(Thunk_pushScreen("setupequipment"))}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
