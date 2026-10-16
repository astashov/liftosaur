import * as ActionSheet from "../src/utils/actionSheet";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { Fixture_build } from "./harness/fixture";
import { RenderApp_mount } from "./harness/renderApp";
import { RenderEnv_build } from "./harness/renderEnv";

describe("language setting in the real app", () => {
  it("changes the settings screen and navigation labels immediately", async () => {
    const state = Fixture_build({ ongoingWorkout: false, subscribed: false });
    state.storage.settings.language = "en";
    const picker = jest.spyOn(ActionSheet, "ActionSheet_show").mockImplementation((options, callback) => {
      callback(options.options.indexOf("Français"));
    });
    const app = await RenderApp_mount(state, RenderEnv_build().env, { start: "home" });
    try {
      await app.tapFooter("me");
      expect(screen.getByTestId("menu-item-language")).toBeTruthy();
      await act(async () => {
        fireEvent.press(screen.getByText("English"));
      });
      await app.settle();
      expect(screen.getByText("Langue")).toBeTruthy();
      expect(screen.getByText("Apparence")).toBeTruthy();
      expect(screen.getByText("Français")).toBeTruthy();
      expect(screen.getByTestId("menu-item-language")).toBeTruthy();
      expect(screen.getByTestId("footer-me")).toBeTruthy();
      expect(screen.getAllByText("Profil").length).toBeGreaterThan(0);
    } finally {
      picker.mockRestore();
      await app.unmount();
    }
  });
});
