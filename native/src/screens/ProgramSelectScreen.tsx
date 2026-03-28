import React from "react";
import { useDispatch } from "../context/DispatchContext";
import { ScreenProgramSelect } from "@crossplatform/components/ScreenProgramSelect";

export function ProgramSelectScreen(): React.ReactElement {
  const dispatch = useDispatch();
  return <ScreenProgramSelect dispatch={dispatch} />;
}
