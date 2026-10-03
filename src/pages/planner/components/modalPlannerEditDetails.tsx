import { JSX } from "react";
import { Modal } from "../../../components/modal";
import { EditDetailsForm } from "../../../components/editDetailsForm";
import { IGridEditDetailsRequest, IGridEditDetailsResult } from "../../../components/editProgram/editProgramGrid/gridHost";

export function ModalPlannerEditDetails(props: {
  request: IGridEditDetailsRequest;
  onClose: (result?: IGridEditDetailsResult) => void;
}): JSX.Element {
  return (
    <Modal name="planner-edit-details" shouldShowClose={true} onClose={() => props.onClose()}>
      <EditDetailsForm
        data={{ ...props.request, nameLabel: "Name", submitLabel: "Save" }}
        onCancel={() => props.onClose()}
        onSubmit={(result) => props.onClose(result)}
      />
    </Modal>
  );
}
