import React from "react";
import { useDispatch } from "../context/DispatchContext";
import { ScreenFirst } from "@crossplatform/components/ScreenFirst";

export function FirstScreen(): React.ReactElement {
  const dispatch = useDispatch();
  return <ScreenFirst dispatch={dispatch} />;
}
