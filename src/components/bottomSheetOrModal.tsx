import { JSX, ComponentChildren, h } from "preact";
import { useContext } from "preact/hooks";
import { AppContext } from "./appContext";
import { BottomSheet } from "./bottomSheet";
import { Modal } from "./modal";

interface IProps {
  isHidden: boolean;
  shouldShowClose?: boolean;
  children: ComponentChildren;
  zIndex?: number;
  onClose: () => void;
}

export function BottomSheetOrModal(props: IProps): JSX.Element {
  const appContext = useContext(AppContext);
  return appContext.isApp ? <BottomSheet {...props} /> : <Modal {...props} />;
}
