import { h, JSX } from "preact";
import { Modal } from "./modal";
import { IDispatch } from "../ducks/types";
import { Button } from "./button";
import { Thunk } from "../ducks/thunks";
import { useEffect } from "preact/hooks";

interface IModalThanks25Props {
  dispatch: IDispatch;
  onClose: () => void;
}

export function ModalThanks25(props: IModalThanks25Props): JSX.Element {
  useEffect(() => {
    props.dispatch(Thunk.postevent("thanks25-impression"));
  }, []);
  return (
    <Modal isHidden={false} isFullWidth={true} shouldShowClose={true} onClose={props.onClose} zIndex={60}>
      <div className="px-8 py-4">
        <div className="pb-2 text-center">
          <img
            src="/images/thanks25.png"
            className="inline-block"
            style={{ width: "100%", maxWidth: "300px" }}
            alt="Thanksgiving 2025!"
          />
        </div>
        <div className="text-center">
          <div className="mb-4">
            <div>
              <span className="text-lg font-bold text-orange-600">30%</span> off
            </div>
            <div>first year of subscription</div>
          </div>
          <div className="mb-4">
            <div className="text-xl">
              <strong>Code: </strong>
              <span className="font-bold text-text-purple">THANKS25</span>
            </div>
            <div className="text-sm text-text-secondary">Valid 25 Nov - 3 Dec 25</div>
          </div>
          <div className="mb-4">
            <div>
              Applicable to <span className="font-bold text-text-purple">monthly</span> and{" "}
              <span className="font-bold text-text-purple">yearly</span> subscriptions.
            </div>
          </div>
          <div>
            <Button
              name="modal-thanks25-purchase"
              kind="purple"
              onClick={() => {
                props.dispatch(Thunk.postevent("thanks25-cta"));
                props.dispatch(Thunk.pushScreen("subscription"));
                props.onClose();
              }}
            >
              Purchase Now!
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
