import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";

export function NavModalInputSelect(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("inputSelectModal");

  const onClose = (): void => {
    Modal_clear(modalDispatch, "inputSelectModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      {data.hint && <div className="pt-1 pl-2 pr-8 text-xs text-text-secondary">{data.hint}</div>}
      <div className="flex flex-col px-2 py-2">
        {data.emptyLabel != null && (
          <button
            data-cy="select-option-empty"
            className={`py-2 px-2 cursor-pointer text-left ${
              data.selectedValue == null ? "bg-background-subtle rounded" : "border-border-neutral"
            }`}
            onClick={() => {
              Modal_setResult(modalDispatch, "inputSelectModal", null);
              Modal_clear(modalDispatch, "inputSelectModal");
              navigation.goBack();
            }}
          >
            {data.emptyLabel}
          </button>
        )}
        {data.values.map(([key, label], i) => (
          <button
            data-cy={`select-option-${key}`}
            key={key}
            className={`py-2 px-2 ${i !== 0 && key !== data.selectedValue ? "border-t" : ""} cursor-pointer text-left ${
              key === data.selectedValue ? "bg-background-subtle rounded" : "border-border-neutral"
            }`}
            onClick={() => {
              Modal_setResult(modalDispatch, "inputSelectModal", key);
              Modal_clear(modalDispatch, "inputSelectModal");
              navigation.goBack();
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </SheetScreenContainer>
  );
}
