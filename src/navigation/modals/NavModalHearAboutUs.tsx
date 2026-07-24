import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { IState, updateState } from "../../models/state";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { useClearOnModalRemove } from "../useClearOnModalRemove";
import { HearAboutUsSurvey } from "../../components/hearAboutUs/hearAboutUsSurvey";
import {
  HearAboutUs_selectSource,
  HearAboutUs_updatePartial,
  HearAboutUs_finalize,
  HearAboutUs_appendRequest,
  HearAboutUs_markDone,
  HearAboutUs_logShown,
  HearAboutUs_skip,
} from "../../models/hearAboutUs";

export function NavModalHearAboutUs(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const resolutionRef = useRef<"answered" | "later" | "dismissed">("dismissed");
  const hasResultRef = useRef(false);
  hasResultRef.current = state.storage.hearAboutUs?.result != null;

  useClearOnModalRemove(() => {
    updateState(dispatch, [lb<IState>().p("showHearAboutUs").record(false)], "Close hear-about-us");
    const resolution = resolutionRef.current;
    if (resolution === "answered") {
      return;
    }
    if (resolution === "later") {
      HearAboutUs_appendRequest(dispatch);
      return;
    }
    // "dismissed" (incl. swipe/back): only stop asking if the user gave us nothing — a chosen source
    // is already persisted and suppresses future asks on its own.
    if (!hasResultRef.current) {
      HearAboutUs_skip(dispatch);
      HearAboutUs_markDone(dispatch);
    }
  });

  useEffect(() => {
    HearAboutUs_logShown(dispatch);
  }, [dispatch]);

  return (
    <ModalScreenContainer onClose={() => navigation.goBack()} isFullWidth>
      <FormSheet noPadding>
        <HearAboutUsSurvey
          context="backfill"
          variant="sheet"
          initialAnswer={state.storage.hearAboutUs?.result}
          onSelectSource={(s) => HearAboutUs_selectSource(dispatch, s)}
          onChange={(p) => HearAboutUs_updatePartial(dispatch, p)}
          onComplete={(payload) => {
            resolutionRef.current = "answered";
            HearAboutUs_finalize(dispatch, payload);
            navigation.goBack();
          }}
          onSkip={() => {
            resolutionRef.current = "dismissed";
            navigation.goBack();
          }}
          onMaybeLater={() => {
            resolutionRef.current = "later";
            navigation.goBack();
          }}
        />
      </FormSheet>
    </ModalScreenContainer>
  );
}
