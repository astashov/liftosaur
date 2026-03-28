import React from "react";
import { useDispatch } from "../context/DispatchContext";
import { ScreenFirst } from "@crossplatform/components/screens/ScreenFirst";

export function NativeScreenFirst(): React.ReactElement {
  const dispatch = useDispatch();
  return <ScreenFirst dispatch={dispatch} />;
}
