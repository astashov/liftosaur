import { useTranslation } from "../i18n/context";
import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { GroupHeader } from "./groupHeader";
import { Input, IInputHandle, IValidationError } from "./input";
import { MarkdownEditorBorderless } from "./markdownEditorBorderless";
import { Button } from "./button";
import { IEither } from "../utils/types";

export interface IEditDetailsFormData {
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  submitLabel: string;
  dataCyPrefix: string;
  name: string;
  description?: string;
}

export function EditDetailsForm(props: {
  data: IEditDetailsFormData;
  onCancel: () => void;
  onSubmit: (result: { name: string; description?: string }) => void;
}): JSX.Element {
  const translate = useTranslation();
  const { data } = props;
  const [typedNameResult, setTypedNameResult] = useState<IEither<string, Set<IValidationError>>>();
  const descriptionRef = useRef<string | undefined>(undefined);
  const inputHandle = useRef<IInputHandle>(null);

  const name =
    typedNameResult == null ? data.name.trim() : typedNameResult.success ? typedNameResult.data.trim() : undefined;

  const onSubmit = (): void => {
    if (!name) {
      inputHandle.current?.touch();
      return;
    }
    const description = (descriptionRef.current ?? data.description ?? "").trim();
    props.onSubmit({ name, description: description.length > 0 ? description : undefined });
  };

  return (
    <>
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
        changeHandler={setTypedNameResult}
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
          onClick={props.onCancel}
        >
          {translate("Cancel")}
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
    </>
  );
}
