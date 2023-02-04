import { h, JSX } from "preact";
import { Modal } from "../../../components/modal";

interface IBuilderModalExerciseProps {
  onClose: () => void;
}

export function BuilderModalOnboarding(props: IBuilderModalExerciseProps): JSX.Element {
  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      Help
    </Modal>
  );
}
