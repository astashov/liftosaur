import { JSX, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { Button } from "../../components/button";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { Thunk_postevent, Thunk_pushScreen } from "../../ducks/thunks";
import { SendMessage_isIos } from "../../utils/sendMessage";

export function NavModalThanks25(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();

  useEffect(() => {
    dispatch(Thunk_postevent("thanks25-impression"));
  }, []);

  const onClose = (): void => {
    updateState(
      dispatch,
      [
        lb<IState>()
          .p("storage")
          .p("helps")
          .recordModify((help) => [...help, "thanks25"]),
      ],
      "Dismiss Thanksgiving 25% modal"
    );
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
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
            {SendMessage_isIos() ? (
              <div>
                <div className="text-sm">
                  <strong>Monthly Code: </strong>
                  <span className="font-bold text-text-purple">THANKS25</span>
                </div>
                <div className="text-sm">
                  <strong>Yearly Code: </strong>
                  <span className="font-bold text-text-purple">THANKS25Y</span>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <strong>Code: </strong>
                <span className="font-bold text-text-purple">THANKS25</span>
              </div>
            )}
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
                dispatch(Thunk_postevent("thanks25-cta"));
                dispatch(Thunk_pushScreen("subscription"));
                onClose();
              }}
            >
              Purchase Now!
            </Button>
          </div>
        </div>
      </div>
    </ModalScreenContainer>
  );
}
