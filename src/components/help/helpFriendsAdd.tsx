import { h, JSX, Fragment } from "preact";

export function HelpFriendsAdd(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Add Friend</h2>
      <p className="pb-2">This screen has the list of all the users in the app.</p>
      <p className="pb-2">
        You can search friends either by id (which you can find on the user's profile page), or by a nickname they
        specify in settings.
      </p>
    </>
  );
}
