import { JSX, useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { IDispatch } from "../ducks/types";
import { Thunk_redeemCoupon } from "../ducks/thunks";
import { IconSpinner } from "./icons/iconSpinner";

interface IModalCouponContentProps {
  dispatch: IDispatch;
  onClose: () => void;
}

export function ModalCouponContent(props: IModalCouponContentProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  return (
    <>
      <h3 className="pt-4 pb-2 text-lg font-bold">Redeem Code</h3>
      <div className="mb-2 text-center">
        <Input maxLength={8} labelSize="xs" label="Code" ref={textInput} />
      </div>
      <div className="text-center">
        <Button
          name="redeem-coupon"
          kind="purple"
          onClick={() => {
            const value = textInput.current?.value?.trim() || "";
            if (value) {
              setIsLoading(true);
              props.dispatch(
                Thunk_redeemCoupon(value, (success) => {
                  if (success) {
                    props.onClose();
                  }
                  setIsLoading(false);
                })
              );
            }
          }}
        >
          {isLoading ? <IconSpinner color="white" width={18} height={18} /> : "Redeem"}
        </Button>
      </div>
    </>
  );
}
