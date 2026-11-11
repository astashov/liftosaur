import { JSX, useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { Modal } from "../../components/modal";
import { ExercisePickerContent } from "../../components/exercisePicker/bottomSheetExercisePicker";
import { ExercisePickerUtils_swapState } from "../../components/exercisePicker/exercisePickerUtils";
import { DashboardWidgetSheetBody } from "../../components/dashboard/dashboardWidgetSheetBody";
import { IDashboardWidgetModalData, IDashboardWidgetModalResult } from "../../models/dashboardWidgetCommit";
import { ILiftographSeriesEval } from "../../liftograph/liftographSeriesEval";
import { IExercisePickerSelectedExercise, IExercisePickerState, IHistoryRecord, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { Dialog_alert } from "../../utils/dialog";

const SHEET_WIDTH = "720px";
const SHEET_MAX_WIDTH = "92%";
const SHEET_HEIGHT = "85vh";

interface IPickerRequest {
  state: IExercisePickerState;
  resolve: (selected: IExercisePickerSelectedExercise | undefined) => void;
}

function DashboardEditorExercisePicker(props: {
  request: IPickerRequest;
  settings: ISettings;
  onClose: (selected: IExercisePickerSelectedExercise | undefined) => void;
}): JSX.Element {
  const [pickerState, setPickerState] = useState(props.request.state);
  const dispatch: ILensDispatch<IExercisePickerState> = useCallback((recordings) => {
    const all = Array.isArray(recordings) ? recordings : [recordings];
    setPickerState((prev) => all.reduce((memo, recording) => recording.fn(memo), prev));
  }, []);
  return (
    <Modal
      isFullHeight={true}
      noPaddings={true}
      overflowHidden={true}
      zIndex={50}
      maxWidth={SHEET_MAX_WIDTH}
      style={{ width: SHEET_WIDTH }}
      innerClassName="flex flex-col pt-4"
      closeOnOverlayClick={true}
      onClose={() => props.onClose(undefined)}
    >
      <ExercisePickerContent
        settings={props.settings}
        isLoggedIn={true}
        exercisePicker={pickerState}
        usedExerciseTypes={[]}
        dispatch={dispatch}
        onChoose={(selected) => props.onClose(selected[0])}
        onChangeCustomExercise={() => Dialog_alert("Create and edit custom exercises in the app.")}
        onStar={() => undefined}
        onChangeSettings={() => undefined}
        onClose={() => props.onClose(undefined)}
      />
    </Modal>
  );
}

export interface IDashboardEditorWidgetModalProps {
  data: IDashboardWidgetModalData;
  settings: ISettings;
  history: IHistoryRecord[];
  evaluation: ILiftographSeriesEval;
  onClose: () => void;
  onDone: (result: IDashboardWidgetModalResult) => void;
}

export function DashboardEditorWidgetModal(props: IDashboardEditorWidgetModalProps): JSX.Element {
  const { settings } = props;
  const [picker, setPicker] = useState<IPickerRequest | undefined>(undefined);
  const pickerRef = useRef(picker);
  pickerRef.current = picker;

  return (
    <>
      <DashboardWidgetSheetBody
        data={props.data}
        settings={settings}
        history={props.history}
        evaluation={props.evaluation}
        onClose={props.onClose}
        onDone={props.onDone}
        pickExercise={(exerciseType) =>
          new Promise((resolve) =>
            setPicker({ state: ExercisePickerUtils_swapState({ exerciseType }, settings), resolve })
          )
        }
        frame={(content, shouldClose) => (
          <Modal
            name="dashboard-widget"
            noPaddings={true}
            overflowHidden={true}
            maxWidth={SHEET_MAX_WIDTH}
            style={{ width: SHEET_WIDTH, height: SHEET_HEIGHT }}
            innerClassName="flex flex-col pt-3"
            closeOnOverlayClick={true}
            onClose={async () => {
              if (pickerRef.current == null && (await shouldClose())) {
                props.onClose();
              }
            }}
          >
            <View style={{ flex: 1 }}>{content}</View>
          </Modal>
        )}
      />
      {picker != null ? (
        <DashboardEditorExercisePicker
          request={picker}
          settings={settings}
          onClose={(selected) => {
            picker.resolve(selected);
            setPicker(undefined);
          }}
        />
      ) : null}
    </>
  );
}
