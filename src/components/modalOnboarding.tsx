import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";
import { InternalLink } from "../internalLink";

export function ModalOnboarding(props: { onClose: () => void }): JSX.Element {
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <h3 className="pb-2 font-bold text-center">Welcome to Liftosaur!</h3>
      <section className="text-sm">
        <p className="mb-2">
          It's an app, that allows you to create custom weightlifting routines with flexible progression schemes, using
          a built-in scripting language called Liftoscript. It also contains a bunch of pre-built routines from{" "}
          <a
            className="text-blue-700 underline"
            href="https://thefitness.wiki/routines/strength-training-muscle-building/"
            target="_blank"
          >
            /r/fitness and /r/weightroom on Reddit
          </a>
          , which helped thousands of lifters already to achieve their weightlifting goals.
        </p>
        <p className="mb-2">
          With simple and friendly user interface, this app will walk you through the routines, handling weights
          progressing and deloading. You can read more and check some screenshots/videos on our{" "}
          <InternalLink href="/about" className="text-blue-700 underline">
            landing page
          </InternalLink>
          .
        </p>
        <p>
          The features include:
          <ul className="py-2 pl-4 list-disc">
            <li>Simple user interface to track the progress</li>
            <li>Optional signing-in (via Google), and storing the progress in the cloud (if you're logged in)</li>
            <li>History view</li>
            <li>Rest Timer</li>
            <li>Plates calculator</li>
            <li>Rounding up the weights according to available plates in your gym</li>
            <li>Progress graphs for main lifts</li>
            <li>Custom routines builder</li>
            <li>Ability to create progression schemes using built-in scripting language Liftoscript.</li>
          </ul>
        </p>
        <p>
          There're more features on the roadmap, like:
          <ul className="py-2 pl-4 list-disc">
            <li>More routines added. The app is designed to be very flexible and allow almost any possible routine.</li>
            <li>Showing muscles map and activated muscles per exercise, workout day or whole program</li>
            <li>Achievements</li>
            <li>And much more!</li>
          </ul>
        </p>
        <p className="mb-4">So check it out! Hopefully you like it :)</p>
        <p className="text-center">
          <Button type="button" kind="green" className="mr-3" onClick={props.onClose}>
            Let's choose a program!
          </Button>
        </p>
      </section>
    </Modal>
  );
}
