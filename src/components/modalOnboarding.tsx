import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";
import { InternalLink } from "../internalLink";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";

interface IProps {
  dispatch: IDispatch;
  onClose: () => void;
}

export function ModalOnboarding(props: IProps): JSX.Element {
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <h3 className="pb-2 font-bold text-center">Welcome to Liftosaur!</h3>
      <section className="text-sm">
        <p className="mb-4">
          If you <strong>don't know what this app</strong> is,{" "}
          <InternalLink className="text-blue-700 underline" href="/about">
            press here
          </InternalLink>{" "}
          to read about it, it's pretty cool!
        </p>
        <p>
          If you are <strong>complete noob in weightlifting</strong>, and just want to start,{" "}
          <a
            href="https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/"
            target="_blank"
            className="text-blue-700 underline"
          >
            read this first
          </a>{" "}
          and then press here:
        </p>
        <p className="mb-4 text-center">
          <Button
            onClick={() => {
              props.dispatch(Thunk.cloneAndSelectProgram("basicBeginner"));
            }}
            kind="green"
          >
            Start Basic Beginner Routine
          </Button>
        </p>
        <p>
          And if you <strong>have some experience</strong>, and want to pick a program for you, then you can pick a
          program or create a new one.
        </p>
        <p className="text-center">
          <Button onClick={props.onClose} kind="blue">
            Pick or Create a Program
          </Button>
        </p>
      </section>
    </Modal>
  );
}
