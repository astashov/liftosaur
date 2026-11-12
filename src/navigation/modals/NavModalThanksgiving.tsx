import { JSX, useEffect } from "react";
import { Image, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { Button } from "../../components/button";
import { ThanksgivingPromoCodes } from "../../components/thanksgivingPromoCodes";
import { IState, updateState } from "../../models/state";
import { ThanksgivingPromo_helpKey, ThanksgivingPromo_imagePath } from "../../models/thanksgivingPromo";
import { Thunk_postevent, Thunk_pushScreen } from "../../ducks/thunks";
import { ImagePreloader_uri } from "../../utils/imagePreloader";

export function NavModalThanksgiving(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();

  useEffect(() => {
    dispatch(Thunk_postevent(`${ThanksgivingPromo_helpKey}-impression`));
    return navigation.addListener("beforeRemove", () => {
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("storage")
            .p("helps")
            .recordModify((helps) =>
              helps.includes(ThanksgivingPromo_helpKey) ? helps : [...helps, ThanksgivingPromo_helpKey]
            ),
        ],
        "Dismiss Thanksgiving promo modal"
      );
    });
  }, [navigation, dispatch]);

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose}>
      <FormSheet>
        <View className="items-center pb-2">
          <Image
            source={{ uri: ImagePreloader_uri(ThanksgivingPromo_imagePath) }}
            style={{ width: "100%", maxWidth: 300, aspectRatio: 793 / 658 }}
            resizeMode="contain"
            accessibilityLabel="Happy Thanksgiving!"
          />
        </View>
        <ThanksgivingPromoCodes />
        <View className="items-center pt-4 pb-2">
          <Button
            name="modal-thanksgiving-purchase"
            kind="purple"
            onClick={() => {
              dispatch(Thunk_postevent(`${ThanksgivingPromo_helpKey}-cta`));
              navigation.goBack();
              dispatch(Thunk_pushScreen("subscription"));
            }}
          >
            Get Premium
          </Button>
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
