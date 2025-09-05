import { JSX, h } from "preact";
import { useLayoutEffect } from "preact/hooks";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";

type INonNullableValues<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

interface IProps<T extends Record<string, unknown | undefined>> {
  state: T;
  dispatch: IDispatch;
  children: (state: INonNullableValues<T>) => JSX.Element;
}

export function FallbackScreen<T extends Record<string, unknown>>(props: IProps<T>): JSX.Element {
  const hasAnyNulls = Object.values(props.state).some((value) => value == null);
  useLayoutEffect(() => {
    if (hasAnyNulls) {
      props.dispatch(Thunk.pushScreen("main", undefined, true));
    }
  }, [hasAnyNulls]);

  if (hasAnyNulls) {
    return <div />;
  }

  return props.children(props.state as INonNullableValues<T>);
}
