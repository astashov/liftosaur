import { AppRegistry } from "react-native";
import App from "./components/app2";
import { initializeApp } from "./initialize";

async function run(): Promise<void> {
  const essentials = await initializeApp();
  AppRegistry.registerComponent("Liftosaur", () => App);
  AppRegistry.runApplication("Liftosaur", {
    initialProps: { essentials },
    rootTag: document.getElementById("app"),
  });
}

run();
