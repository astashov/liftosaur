import InAppReview from "react-native-in-app-review";

export async function InAppReview_request(): Promise<void> {
  try {
    if (!InAppReview.isAvailable()) {
      return;
    }
    await InAppReview.RequestInAppReview();
  } catch (e) {
    console.warn("InAppReview_request failed", e);
  }
}
