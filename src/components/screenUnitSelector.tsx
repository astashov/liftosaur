import React, { JSX } from "react";
import { IDispatch } from "../ducks/types";
import { Button } from "./button";
import { updateSettings } from "../models/state";
import { ISettings } from "../types";
import { Thunk } from "../ducks/thunks";
import { lb } from "lens-shmens";

interface IProps {
  dispatch: IDispatch;
}

export function ScreenUnitSelector(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col items-center justify-center h-full text-blackv2">
      <div className="box-content flex items-center max-w-sm px-16 py-8">
        <div className="flex-1 text-center">
          <h1 className="pb-6 text-xl">
            Pick your <strong>default</strong> units
          </h1>
          <div className="flex gap-8 pb-6">
            <div className="flex-1">
              <Button
                name="unit-lb"
                kind="purple"
                onClick={() => {
                  updateSettings(props.dispatch, lb<ISettings>().p("units").record("lb"));
                  props.dispatch(Thunk.pushScreen("programs"));
                }}
              >
                Pounds (lb)
              </Button>
            </div>
            <div className="flex-1">
              <Button
                name="unit-kg"
                kind="purple"
                onClick={() => {
                  updateSettings(props.dispatch, lb<ISettings>().p("units").record("kg"));
                  props.dispatch(Thunk.pushScreen("programs"));
                }}
              >
                Kilograms (kg)
              </Button>
            </div>
          </div>
          <div className="text-base text-grayv2-main">
            The units you select would be used <strong>by default</strong>, but you'll be able to override for specific{" "}
            <strong>equipment</strong>. You can also change it any time in <strong>Settings</strong>.
          </div>
        </div>
      </div>
    </section>
  );
}
