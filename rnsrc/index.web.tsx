import { AppRegistry } from "react-native";
import App from "./components/app2";
import { initializeApp } from "./initialize";

async function run(): Promise<void> {
  const essentials = await initializeApp();
  console.log(essentials);
  AppRegistry.registerComponent("Liftosaur", () => App);
  AppRegistry.runApplication("Liftosaur", {
    initialProps: {},
    rootTag: document.getElementById("app"),
  });
}

run();
