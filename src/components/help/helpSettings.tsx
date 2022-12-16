import { h, JSX, Fragment } from "preact";

export function HelpSettings(): JSX.Element {
  return (
    <>
      <h2 className="pb-2 text-xl">Settings</h2>
      <p className="pb-2">
        This is the main settings screen. The settings are grouped by a common theme (Account, Workout, etc). Some
        settings are only visible if you're logged in, e.g. the "Friends" settings.
      </p>
      <p className="pb-2">
        Under <strong>Account</strong> section, you can go to the account screen, and log in there. For now, we only
        support <strong>login via Google</strong>. After you log in, your data will be synced to the cloud, so even if
        you lose your phone, your progress won't be lost. Also, you'll be able to add friends, see their progress,
        comment and like their workouts.
      </p>
      <p className="pb-2">
        Make sure to set your <strong>Available Equipment</strong>. The plates you specify there would be used when
        calculating weight for exercises, and the weight would be round up so that you can get it with your available
        equipment. Like if you have only <strong>4x45lb</strong> plates and a barbell, you won't be able to get{" "}
        <strong>150lb</strong>, so the app would convert it to <strong>135lb (bar + 2x45lb plates)</strong> - the weight
        you can actually get with your available plates.
      </p>
      <p className="pb-2">
        In <strong>Import / Export</strong> section, you can import and export all your stored app data to a JSON file.
        You can use it to backup your data, or to transfer it to another device (e.g. if you don't want to create an
        account and sync data to the cloud). You can also import programs there (which you previously exported on the
        "Edit Program" screen).
      </p>
      <p className="pb-2">
        You can also export your history to CSV file, and then open it e.g. in Excel, if you want to analyze your data
        there.
      </p>
    </>
  );
}
