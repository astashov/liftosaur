import { AppRegistry } from "react-native";
import App from "./rnsrc/components/app2";
import { name as appName } from "./app.json";
import { IInitializeEssentials, initializeApp } from "./rnsrc/initialize";
import React from "react";

function withEssentials(props: IInitializeEssentials) {
  return () => React.createElement(App, { essentials: props });
}

async function run(): Promise<void> {
  const essentials = await initializeApp();
  console.log(essentials);
  AppRegistry.registerComponent(appName, () => withEssentials(essentials));
}
run();
