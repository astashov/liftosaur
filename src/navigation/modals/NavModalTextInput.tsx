import { JSX, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";
import { GroupHeader } from "../../components/groupHeader";
import { Input2 } from "../../components/input2";
import { Button } from "../../components/button";

export function NavModalTextInput(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("textInputModal");
  const [name, setName] = useState("");

  const onClose = (): void => {
    Modal_clear(modalDispatch, "textInputModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <GroupHeader size="large" name={data.title} />
      <form onSubmit={(e) => e.preventDefault()}>
        <Input2
          identifier={data.dataCyPrefix}
          onInput={(event) => {
            setName(event.currentTarget.value);
          }}
          label={data.inputLabel}
          required
          requiredMessage={`${data.inputLabel} cannot be empty`}
          type="text"
          placeholder={data.placeholder}
        />
        <div className="mt-4 text-right">
          <Button
            name={`${data.dataCyPrefix}-cancel`}
            data-testid={`${data.dataCyPrefix}-cancel`}
            testID={`${data.dataCyPrefix}-cancel`}
            type="button"
            kind="grayv2"
            className="mr-3"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            kind="purple"
            name={`${data.dataCyPrefix}-submit`}
            data-testid={`${data.dataCyPrefix}-submit`}
            testID={`${data.dataCyPrefix}-submit`}
            type="submit"
            disabled={!name.trim()}
            onClick={() => {
              if (name.trim() !== "") {
                Modal_setResult(modalDispatch, "textInputModal", name.trim());
                Modal_clear(modalDispatch, "textInputModal");
                navigation.goBack();
              }
            }}
          >
            {data.submitLabel}
          </Button>
        </div>
      </form>
    </ModalScreenContainer>
  );
}
