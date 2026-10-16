import { memo, type JSX } from "react";
import { Text } from "react-native";
import { cleanup, render, screen } from "@testing-library/react-native";
import { I18nProvider, useTranslation } from "../src/i18n/context";
import { MenuItem } from "../src/components/menuItem";

const MemoizedMenu = memo(function MemoizedMenu() {
  const translate = useTranslation();
  return <MenuItem name="Workout" label={translate("Workout")} value="My English Program" />;
});

function Probe(): JSX.Element {
  const translate = useTranslation();
  return <Text>{translate("Home")}</Text>;
}

afterEach(async () => cleanup());

describe("live language selection", () => {
  it("updates memoized labels while keeping IDs and user data intact", async () => {
    const view = await render(
      <I18nProvider language="en">
        <MemoizedMenu />
      </I18nProvider>
    );
    expect(screen.getByText("Workout")).toBeTruthy();
    expect(screen.getByTestId("menu-item-workout")).toBeTruthy();
    await view.rerender(
      <I18nProvider language="fr">
        <MemoizedMenu />
      </I18nProvider>
    );
    expect(screen.getByText("Séance")).toBeTruthy();
    expect(screen.getByTestId("menu-item-workout")).toBeTruthy();
    expect(screen.getByText("My English Program")).toBeTruthy();
    expect(screen.queryByText("Workout")).toBeNull();
    await view.rerender(
      <I18nProvider language="en">
        <MemoizedMenu />
      </I18nProvider>
    );
    expect(screen.getByText("Workout")).toBeTruthy();
  });

  it("keeps two trees independent", async () => {
    await render(
      <>
        <I18nProvider language="en">
          <Probe />
        </I18nProvider>
        <I18nProvider language="fr">
          <Probe />
        </I18nProvider>
      </>
    );
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Accueil")).toBeTruthy();
  });
});
