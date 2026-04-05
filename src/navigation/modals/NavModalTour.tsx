import { JSX, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { TourModalContent } from "../../components/tour/tourModal";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";

export function NavModalTour(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const stateTour = state.tour;

  const onClose = (): void => {
    updateState(dispatch, [lb<IState>().p("tour").record(undefined)], "Close tour");
    navigation.goBack();
  };

  const shouldGoBack = !stateTour;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !stateTour) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} noPaddings shouldShowClose={false}>
      <TourModalContent
        stateTour={stateTour}
        state={state}
        onClose={onClose}
        onStepSeen={(flag) => {
          if (!state.storage.helps.includes(flag)) {
            updateState(
              dispatch,
              [
                lb<IState>()
                  .p("storage")
                  .p("helps")
                  .recordModify((hlps) => [...hlps, flag]),
              ],
              `Mark tour step ${flag} as seen`
            );
          }
        }}
      />
    </ModalScreenContainer>
  );
}
