import type React from "react";
import type { JSX } from "react";
import { BottomSheet } from "./BottomSheet";

interface IProps {
  isHidden: boolean;
  shouldShowClose?: boolean;
  children: React.ReactNode;
  onClose: () => void;
}

export function BottomSheetOrModal(props: IProps): JSX.Element | null {
  return <BottomSheet {...props} />;
}
