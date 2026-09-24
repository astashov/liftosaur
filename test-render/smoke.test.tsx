import { render, screen } from "@testing-library/react-native";
import { Text, View } from "react-native";

describe("harness", () => {
  it("renders a react-native tree headlessly", async () => {
    await render(
      <View testID="root">
        <Text>hello</Text>
      </View>
    );
    expect(screen.getByTestId("root")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
  });
});
