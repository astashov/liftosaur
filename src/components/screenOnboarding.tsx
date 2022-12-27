import { h, JSX } from "preact";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Button } from "./button";
import { Link } from "./link";
import { LinkButton } from "./linkButton";

interface IProps {
  dispatch: IDispatch;
}

export function ScreenOnboarding(props: IProps): JSX.Element {
  return (
    <section className="h-full text-blackv2">
      <div className="pt-16 text-center">
        <div
          className="pt-24 bg-no-repeat"
          style={{
            backgroundImage: "url(/images/logo.svg)",
            backgroundPosition: "top center",
            backgroundSize: "4rem",
          }}
        >
          <span className="text-xl font-semibold">Liftosaur</span>
        </div>
        <div style={{ width: "15em", margin: "0 auto" }} className="text-sm text-grayv2">
          The <strong>most powerful</strong> weightlifting tracker app
        </div>
        <div className="mt-4">
          Why the most powerful?{" "}
          <Link href="/about" target="_blank">
            Read here!
          </Link>
        </div>
        <div className="mt-4">
          Already have an account?{" "}
          <LinkButton data-cy="onboarding-login" onClick={() => props.dispatch(Thunk.pushScreen("account"))}>
            Log in!
          </LinkButton>
        </div>
        <div className="px-6 mt-10">
          If you are <strong>complete noob</strong> in weightlifting, and just want to start,{" "}
          <Link
            href="https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/"
            target="_blank"
            className="text-blue-700 underline"
          >
            read this first
          </Link>{" "}
          and then
          <div className="mt-6">
            <Button kind="orange" onClick={() => props.dispatch(Thunk.cloneAndSelectProgram("basicBeginner"))}>
              Start Basic Beginner Routine
            </Button>
          </div>
        </div>
        <div className="px-6 mt-8">
          And if you <strong>have some experience</strong>, then you can pick a program or create a new one.
          <div className="mt-6">
            <Button kind="purple" onClick={() => props.dispatch(Thunk.pushScreen("programs"))}>
              Pick or Create a Program
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
