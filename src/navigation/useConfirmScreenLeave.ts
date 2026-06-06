import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import { CommonActions, useNavigation, usePreventRemove } from "@react-navigation/native";
import { IState } from "../models/state";
import { IDispatch } from "../ducks/types";
import { IScreenData, Screen_shouldConfirmNavigation } from "../models/screen";
import { Thunk_confirmScreenLeave } from "../ducks/thunks";
import { untrack } from "./TrackedStateContext";

// Single confirmation point for leaving screens with unsaved edits. Unlike the
// old Thunk_pullScreen dialog, usePreventRemove also intercepts Android system
// back, header back, and cross-tab stack resets. Prevention is armed only
// while there are actual unsaved changes, so navigation stays native otherwise.
export function useConfirmScreenLeave(state: IState, dispatch: IDispatch, screen: IScreenData): void {
  const navigation = useNavigation();
  const confirmation = Screen_shouldConfirmNavigation(untrack(state), screen);
  const shouldConfirm = confirmation != null;
  const screenRef = useRef(screen);
  screenRef.current = screen;

  // The iOS swipe-back completes natively BEFORE the JS pop action can be
  // prevented (native-stack dispatches pop from onDismissed), which desyncs the
  // JS route state from the native stack. The gesture must be disabled while
  // dirty instead; every other prevented path is JS-initiated and safe.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !shouldConfirm });
  }, [navigation, shouldConfirm]);

  // Android back at the root of a tab stack doesn't remove any route — the tab
  // navigator switches tabs (backBehavior) — so usePreventRemove never fires.
  // Intercept the hardware back directly for that case; in-stack pops (index > 0)
  // fall through to react-navigation, where usePreventRemove handles them.
  useEffect(() => {
    if (Platform.OS !== "android" || !shouldConfirm) {
      return undefined;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!navigation.isFocused() || (navigation.getState()?.index ?? 0) > 0) {
        return false;
      }
      dispatch(Thunk_confirmScreenLeave(screenRef.current, CommonActions.goBack()));
      return true;
    });
    return () => subscription.remove();
  }, [navigation, dispatch, shouldConfirm]);

  usePreventRemove(shouldConfirm, ({ data }) => {
    dispatch(Thunk_confirmScreenLeave(screen, data.action));
  });
}
