import { JSX, useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { Modal_clear, Modal_setResult, useModal, useModalData, useModalDispatch } from "../ModalStateContext";
import { useDashboardEvaluation } from "../../components/dashboard/dashboardEvaluation";
import { DashboardWidgetSheetBody } from "../../components/dashboard/dashboardWidgetSheetBody";
import { IExercisePickerSelectedExercise } from "../../types";

export function NavModalDashboardWidget(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("dashboardWidgetModal");
  const { state } = useAppState();
  const { settings, history } = state.storage;
  const evaluation = useDashboardEvaluation();
  const pickedRef = useRef<((selected: IExercisePickerSelectedExercise) => void) | undefined>(undefined);
  const openPicker = useModal("liftoEditorExercisePickerModal", (selected) => {
    pickedRef.current?.(selected);
    pickedRef.current = undefined;
  });

  const close = (): void => {
    Modal_clear(modalDispatch, "dashboardWidgetModal");
    navigation.goBack();
  };

  const shouldGoBack = data == null;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);
  if (data == null) {
    return <></>;
  }

  return (
    <DashboardWidgetSheetBody
      data={data}
      settings={settings}
      history={history}
      evaluation={evaluation}
      onClose={close}
      onDone={(result) => {
        Modal_setResult(modalDispatch, "dashboardWidgetModal", result);
        navigation.goBack();
      }}
      pickExercise={(exerciseType) =>
        new Promise((resolve) => {
          pickedRef.current = resolve;
          openPicker({ exerciseType });
        })
      }
      frame={(content, shouldClose) => (
        <SheetScreenContainer onClose={close} shouldClose={shouldClose}>
          <TransparentModal onClose={close} shouldClose={shouldClose}>
            {content}
          </TransparentModal>
        </SheetScreenContainer>
      )}
    />
  );
}
