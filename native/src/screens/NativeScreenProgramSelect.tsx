import React from "react";
import { useDispatch } from "../context/DispatchContext";
import { ScreenProgramSelect } from "@crossplatform/components/screens/ScreenProgramSelect";

export function NativeScreenProgramSelect(): React.ReactElement {
  const dispatch = useDispatch();
  return <ScreenProgramSelect dispatch={dispatch} />;
}
