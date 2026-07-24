import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ModalGraphsContent } from "../../components/modalGraphs";
import { usePerfRenderCount } from "../../utils/usePerfRenderCount";

export function NavModalGraphs(): JSX.Element {
  usePerfRenderCount("NavModalGraphs");
  const navigation = useNavigation();
  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} isFullWidth={true}>
      <FormSheet>
        <ModalGraphsContent isHidden={false} onClose={onClose} />
      </FormSheet>
    </ModalScreenContainer>
  );
}
