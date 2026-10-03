import { useMemo, useRef } from "react";
import { useModal } from "../../../navigation/ModalStateContext";
import { IDispatch } from "../../../ducks/types";
import { GridAppNavigation_create } from "./gridAppNavigation";
import { IGridEditDetailsResult, IGridHost } from "./gridHost";

export function useAppGridHost(programId: string, dispatch: IDispatch): IGridHost {
  const pendingRef = useRef<((details?: IGridEditDetailsResult) => void) | undefined>(undefined);
  const openEditDetailsModal = useModal("editDetailsModal", (details) => {
    const onResult = pendingRef.current;
    pendingRef.current = undefined;
    onResult?.(details);
  });

  return useMemo(
    () => ({
      createNavigation: (context) => GridAppNavigation_create(context, programId, dispatch),
      openEditDetails: (request, onResult) => {
        pendingRef.current = onResult;
        openEditDetailsModal({ ...request, nameLabel: "Name", submitLabel: "Save" });
      },
    }),
    [programId, dispatch, openEditDetailsModal]
  );
}
