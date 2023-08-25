import { h, JSX } from "preact";
import { Button } from "./button";
import { Modal } from "./modal";

interface IModalAmrapProps {
  backup: boolean;
  userId: string;
  local: boolean;
  onReset: () => void;
}

export function ModalCorruptedState(props: IModalAmrapProps): JSX.Element {
  return (
    <Modal shouldShowClose={false}>
      <h3 className="pt-2 pb-4 text-lg font-bold text-center">🚨 Corrupted Storage 🚨</h3>
      <p className="pb-4">
        Something went <strong>terribly wrong</strong>, and your {props.local ? "local" : "remote"} storage and history
        got corrupted. This should never happen, but it did.
      </p>
      {props.backup ? (
        <div className="pb-4 font-bold text-center text-greenv2-main">
          History was successfully backed up, user: <strong>{props.userId}</strong>
        </div>
      ) : (
        <div className="pb-4 font-bold text-center text-redv2-main">Could not back up the history</div>
      )}
      <p className="pb-4">
        The developer of this app is notified about this, and is going to look into this ASAP. You can contact us at{" "}
        <a className="font-bold underline text-bluev2" href="mailto:info@liftosaur.com">
          info@liftosaur.com
        </a>
        .
      </p>
      {props.local ? (
        <p className="pb-4">
          You can either wait until this is fixed (and close the app for now), or start with the empty state (but your
          history and programs will be gone).
        </p>
      ) : (
        <p className="pb-4">
          We will log out for now, and won't sync the changes to the cloud, to avoid even bigger mess.
        </p>
      )}
      <div className="text-center">
        <Button kind="red" onClick={props.onReset}>
          {props.local ? "Reset and start from scratch" : "Continue"}
        </Button>
      </div>
    </Modal>
  );
}
