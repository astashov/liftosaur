import { JSX, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { Thunk_redeemCoupon } from "../ducks/thunks";
import { IconSpinner } from "./icons/iconSpinner";
import { Input, IInputHandle, IValidationError } from "./input";
import { IEither } from "../utils/types";

interface IModalCouponContentProps {
  dispatch: IDispatch;
  onClose: () => void;
}

export function ModalCouponContent(props: IModalCouponContentProps): JSX.Element {
  const [result, setResult] = useState<IEither<string, Set<IValidationError>>>();
  const inputHandle = useRef<IInputHandle>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = (): void => {
    if (isLoading) {
      return;
    }
    if (result?.success) {
      const value = result.data.trim();
      if (!value) {
        inputHandle.current?.touch();
        return;
      }
      setIsLoading(true);
      props.dispatch(
        Thunk_redeemCoupon(value, (success) => {
          if (success) {
            props.onClose();
          }
          setIsLoading(false);
        })
      );
    } else {
      inputHandle.current?.touch();
    }
  };

  return (
    <View>
      <Text className="pt-4 pb-2 text-lg font-bold">Redeem Code</Text>
      <Input
        identifier="modal-coupon-code"
        label="Code"
        labelSize="xs"
        maxLength={8}
        autoCapitalize="characters"
        autoCorrect={false}
        required={true}
        requiredMessage="Please enter a code"
        changeType="oninput"
        changeHandler={setResult}
        handleRef={inputHandle}
      />
      <View className="items-center mt-4">
        <Button name="redeem-coupon" kind="purple" disabled={isLoading} onClick={onSubmit}>
          {isLoading ? <IconSpinner color="white" width={18} height={18} /> : "Redeem"}
        </Button>
      </View>
    </View>
  );
}
