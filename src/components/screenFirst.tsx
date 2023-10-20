import { h, JSX } from "preact";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Button } from "./button";
import { IconArrowRight } from "./icons/iconArrowRight";

interface IProps {
  dispatch: IDispatch;
}

export function ScreenFirst(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full text-blackv2">
      <div className="flex items-center px-16 py-8">
        <img className="w-12" src="/images/logo.svg" />
        <div className="flex-1 ml-4">
          <h1 className="text-2xl font-bold">Liftosaur</h1>
          <h2 className="text-sm text-grayv2-main">
            Weightlifting tracker app
            <br />
            for <strong>coders</strong>
          </h2>
        </div>
      </div>
      <div
        className="flex-1"
        style={{
          backgroundImage: "url(/images/buff-coder.png)",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />
      <div className="px-8 pt-8 pb-8 text-xl text-center">
        Build <strong>any weightlifting program</strong> using a simple scripting language, and track your progress.
      </div>
      <div className="pb-12 text-center">
        <Button name="see-how-it-works" kind="purple" onClick={() => props.dispatch(Thunk.pushScreen("onboarding"))}>
          <span className="align-middle">See how it works</span>{" "}
          <IconArrowRight className="inline ml-2 align-middle left-right-animation" color="white" />
        </Button>
      </div>
    </section>
  );
}
