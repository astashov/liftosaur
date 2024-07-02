import { h, JSX, Fragment } from "preact";

export function HelpAccount(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Settings - Account</h2>
      <p className="pb-2">You can log in and log out on this screen.</p>
      <p className="pb-2">
        For now, we only support <strong>login via Google</strong>.
      </p>
      <p className="pb-2">
        After you log in, your data will be synced to the cloud, so even if you lose your phone, your progress won't be
        lost.
      </p>
    </>
  );
}
