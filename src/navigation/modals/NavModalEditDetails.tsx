import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { useModalData, useModalDispatch, Modal_setResult, Modal_clear } from "../ModalStateContext";
import { GroupHeader } from "../../components/groupHeader";
import { Input, IInputHandle, IValidationError } from "../../components/input";
import { MarkdownEditorBorderless } from "../../components/markdownEditorBorderless";
import { Button } from "../../components/button";
import { IEither } from "../../utils/types";

export function NavModalEditDetails(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const data = useModalData("editDetailsModal");
  const [nameResult, setNameResult] = useState<IEither<string, Set<IValidationError>>>();
  const descriptionRef = useRef<string | undefined>(undefined);
  const inputHandle = useRef<IInputHandle>(null);

  const onClose = (): void => {
    Modal_clear(modalDispatch, "editDetailsModal");
    navigation.goBack();
  };

  if (!data) {
    return <></>;
  }

  // Nothing typed yet means the field still holds what it was opened with — an edit that only
  // touches the description never fires the name input's change handler.
  const name = nameResult == null ? data.name.trim() : nameResult.success ? nameResult.data.trim() : undefined;

  const onSubmit = (): void => {
    if (!name) {
      inputHandle.current?.touch();
      return;
    }
    const description = (descriptionRef.current ?? data.description ?? "").trim();
    Modal_setResult(modalDispatch, "editDetailsModal", {
      name,
      description: description.length > 0 ? description : undefined,
    });
    Modal_clear(modalDispatch, "editDetailsModal");
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true} zIndex={70}>
      <FormSheet>
        <GroupHeader size="large" name={data.title} />
        <Input
          identifier={`${data.dataCyPrefix}-name`}
          label={data.nameLabel}
          required
          requiredMessage={`${data.nameLabel} cannot be empty`}
          type="text"
          placeholder={data.namePlaceholder}
          defaultValue={data.name}
          changeType="oninput"
          changeHandler={setNameResult}
          handleRef={inputHandle}
        />
        <View className="mt-4">
          <MarkdownEditorBorderless
            value={data.description}
            placeholder={data.descriptionPlaceholder}
            onChange={(value) => (descriptionRef.current = value)}
          />
        </View>
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
