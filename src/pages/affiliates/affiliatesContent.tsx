import { h, JSX } from "preact";

export interface IAffiliatesContentProps {
  client: Window["fetch"];
}

export function AffiliatesContent(props: IAffiliatesContentProps): JSX.Element {
  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold">Affiliate Program</h1>
      <p className="mt-4">
        Liftosaur offers an affiliate program. If you're a coach, a trainer, or an influencer, you can earn commission
        by offering your weightlifting program on Liftosaur.
      </p>

      <p className="mt-4">
        It's a win-win situation - your clients, users and fans would get your ready-to-use weightlifting program in a
        weightlifting tracker app, and you'd earn money from it too.
      </p>

      <p className="mt-4">It works this way:</p>
      <ul className="mt-4 ml-4 list-disc">
        <li>
          Your create your weightlifting program on a laptop (by visiting{" "}
          <a target="_blank" className="font-bold underline text-bluev2" href="https://www.liftosaur.com/program">
            liftosaur.com/program
          </a>
          ), or on a phone (by installing the <strong>Liftosaur</strong> app and creating a program there)
        </li>
        <li>You copy the link to the program.</li>
        <li>You share the link with your users/customers/clients/fans.</li>
        <li>Users import the program to their phones, and start to do workouts</li>
        <li>You get paid! 💰💰💰</li>
      </ul>

      <p className="mt-4">
        Interested? Shoot us an email -{" "}
        <a className="font-bold underline text-bluev2" href="mailto:info@liftosaur.com">
          info@liftosaur.com
        </a>
        . Also let us know if you need help with creating a program.
      </p>
    </section>
  );
}
