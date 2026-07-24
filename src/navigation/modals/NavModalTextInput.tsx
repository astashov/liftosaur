import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";
import { GroupHeader } from "../../components/groupHeader";
import { Input, IInputHandle, IValidationError } from "../../components/input";
import { Button } from "../../components/button";
import { IEither } from "../../utils/types";

export function NavModalTextInput(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("textInputModal");
  const [result, setResult] = useState<IEither<string, Set<IValidationError>>>();
  const inputHandle = useRef<IInputHandle>(null);

  const onClose = (): void => {
    Modal_clear(modalDispatch, "textInputModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  const onSubmit = (): void => {
    if (result?.success) {
      const value = result.data.trim();
      if (!value) {
        inputHandle.current?.touch();
        return;
      }
      Modal_setResult(modalDispatch, "textInputModal", value);
      Modal_clear(modalDispatch, "textInputModal");
      navigation.goBack();
    } else {
      inputHandle.current?.touch();
    }
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} zIndex={70}>
      <FormSheet>
        <GroupHeader size="large" name={data.title} />
        <Input
          identifier={data.dataCyPrefix}
          label={data.inputLabel}
          required
          requiredMessage={`${data.inputLabel} cannot be empty`}
          type="text"
          placeholder={data.placeholder}
          changeType="oninput"
          changeHandler={setResult}
          handleRef={inputHandle}
        />
        <View className="flex-row items-center justify-between gap-4 mt-4">
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
            onClick={onSubmit}
          >
            {data.submitLabel}
          </Button>
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
