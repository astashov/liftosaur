import { AppRegistry } from "react-native";
import App from "./components/app2";

AppRegistry.registerComponent("Liftosaur", () => App);
AppRegistry.runApplication("Liftosaur", {
  initialProps: {},
  rootTag: document.getElementById("app"),
});
