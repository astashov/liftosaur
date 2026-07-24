import { IState } from "./state";
import { WhatsNew_doesHaveNewUpdates } from "./whatsnew";

export type IOnloadModal = "whatsnew" | "hearaboutus";

const HEAR_ABOUT_US_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;

export function OnloadModal_shouldShowWhatsNew(state: IState): boolean {
  return state.storage.whatsNew != null && WhatsNew_doesHaveNewUpdates(state.storage.whatsNew);
}

export function OnloadModal_shouldShowHearAboutUs(state: IState): boolean {
  if (state.storage.currentProgramId == null) {
    return false;
  }
  const hearAboutUs = state.storage.hearAboutUs;
  const requests = hearAboutUs?.requests ?? [];
  const lastRequest = requests[requests.length - 1];
  return (
    hearAboutUs?.result == null &&
    !hearAboutUs?.done &&
    requests.length < 3 &&
    (lastRequest == null || Date.now() - lastRequest > HEAR_ABOUT_US_COOLDOWN_MS)
  );
}

export function OnloadModal_getNext(state: IState): IOnloadModal | undefined {
  if (OnloadModal_shouldShowWhatsNew(state)) {
    return "whatsnew";
  }
  if (OnloadModal_shouldShowHearAboutUs(state)) {
    return "hearaboutus";
  }
  return undefined;
}
