import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";

export function ModalOnboarding(props: { onClose: () => void }): JSX.Element {
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <h3 className="pb-2 font-bold text-center">Welcome to Liftosaur!</h3>
      <section>
        <p className="mb-2">
          It's an app, that helps you to track your progress when you follow weightlifting routines from{" "}
          <a
            className="text-blue-700 underline"
            href="https://thefitness.wiki/routines/strength-training-muscle-building/"
            target="_blank"
          >
            /r/fitness and /r/weightroom on Reddit
          </a>
          . With simple and friendly user interface, it will walk you through the routines, handling weights
          progressing.
        </p>
        <p>
          The features include:
          <ul className="py-2 pl-4 list-disc">
            <li>Simple user interface to track the progress</li>
            <li>Optional signing-in (via Google), and storing the progress in the cloud (if you're logged in)</li>
            <li>History view</li>
            <li>Rest Timer</li>
            <li>Plates calculator</li>
          </ul>
        </p>
        <p className="mb-2">
          It's still in beta version, and there's only one routine right now -{" "}
          <a
            target="_blank"
            className="text-blue-700 underline"
            href="https://thefitness.wiki/routines/5-3-1-for-beginners/"
          >
            5/3/1 for Beginners
          </a>
          , but you can definitely give it a try, it's a great balanced program, that nicely balances volume and
          intensity.
        </p>
        <p>
          There're more features on the roadmap, like:
          <ul className="py-2 pl-4 list-disc">
            <li>More routines added. The app is designed to be very flexible and allow almost any possible routine.</li>
            <li>Progress Graphs</li>
            <li>Custom routine visual builder</li>
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
