import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { Input, IInputHandle, IValidationError } from "./input";
import { IEither } from "../utils/types";

export function ModalImportFromLinkContent(props: { onSubmit: (value?: string) => void }): JSX.Element {
  const [result, setResult] = useState<IEither<string, Set<IValidationError>>>();
  const inputHandle = useRef<IInputHandle>(null);

  return (
    <View>
      <Text className="my-2 text-lg font-bold">Paste link from /program web editor</Text>
      <Input
        required={true}
        requiredMessage="Please paste a link"
        placeholder="https://www.liftosaur.com/..."
        autoCapitalize="none"
        autoCorrect={false}
        changeType="oninput"
        changeHandler={setResult}
        handleRef={inputHandle}
      />
      <View className="flex-row justify-end mt-4" style={{ gap: 12 }}>
        <Button name="modal-import-from-link-cancel" kind="grayv2" onClick={() => props.onSubmit(undefined)}>
          Cancel
        </Button>
        <Button
          name="modal-import-from-link-submit"
          kind="purple"
          onClick={() => {
            if (result?.success) {
              props.onSubmit(result.data);
            } else {
              inputHandle.current?.touch();
            }
          }}
        >
          Add
        </Button>
      </View>
    </View>
  );
}
