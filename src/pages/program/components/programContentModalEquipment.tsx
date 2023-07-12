import { h, JSX } from "preact";
import { Modal } from "../../../components/modal";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { ISettings } from "../../../types";
import { Lens } from "lens-shmens";
import { EquipmentSettings } from "../../../components/equipmentSettings";

interface IProgramContentModalEquipmentProps<T> {
  isHidden: boolean;
  dispatch: ILensDispatch<IProgramEditorState>;
  lensPrefix: Lens<IProgramEditorState, ISettings>;
  settings: ISettings;
  onClose: () => void;
}

export function ProgramContentModalEquipment<T>(props: IProgramContentModalEquipmentProps<T>): JSX.Element {
  return (
    <Modal isHidden={props.isHidden} shouldShowClose={true} onClose={props.onClose}>
      <div style={{ minWidth: "20rem" }}>
        <EquipmentSettings lensPrefix={props.lensPrefix} dispatch={props.dispatch} settings={props.settings} />
      </div>
    </Modal>
  );
}
