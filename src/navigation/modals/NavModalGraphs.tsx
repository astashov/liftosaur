import { JSX, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { ModalGraphsContent } from "../../components/modalGraphs";
import { History_findAllMaxSetsPerId } from "../../models/history";
import { ObjectUtils_keys } from "../../utils/object";
import { Exercise_fromKey } from "../../models/exercise";

export function NavModalGraphs(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const settings = state.storage.settings;

  const exerciseTypes = useMemo(() => {
    const maxSets = History_findAllMaxSetsPerId(state.storage.history);
    return ObjectUtils_keys(maxSets).map(Exercise_fromKey);
  }, [state.storage.history]);

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} isFullWidth={true}>
      <ModalGraphsContent
        settings={settings}
        isHidden={false}
        exerciseTypes={exerciseTypes}
        stats={state.storage.stats}
        graphs={settings.graphs.graphs}
        onClose={onClose}
        dispatch={dispatch}
      />
    </ModalScreenContainer>
  );
}
