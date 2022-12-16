import { h, JSX, Fragment } from "preact";

export function HelpFriends(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Friends</h2>
      <p className="pb-2">This screen has the list of your friends.</p>
      <p className="pb-2">From here, you can either add a friend, or accept / resend invitation, or remove a friend.</p>
    </>
  );
}
