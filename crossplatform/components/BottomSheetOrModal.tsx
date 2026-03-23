import React from "react";
import { BottomSheet } from "./BottomSheet";

interface IProps {
  isHidden: boolean;
  shouldShowClose?: boolean;
  children: React.ReactNode;
  onClose: () => void;
}

export function BottomSheetOrModal(props: IProps): React.ReactElement | null {
  return <BottomSheet {...props} />;
}
