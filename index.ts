import { AppRegistry } from "react-native";
import App from "./rnsrc/components/app2";
import { name as appName } from "./app.json";
import { IInitializeEssentials, initializeApp } from "./rnsrc/initialize";
import React from "react";
import { localapidomain, localdomain } from "./src/localdomain";

declare const global: { __API_HOST__: string; __HOST__: string };
global.__API_HOST__ = `https://${localapidomain}.liftosaur.com:3000`;
global.__HOST__ = `https://${localdomain}.liftosaur.com:8080`;

function withEssentials(props: IInitializeEssentials) {
  return () => React.createElement(App, { essentials: props });
}

async function run(): Promise<void> {
  const essentials = await initializeApp();
  console.log(essentials);
  AppRegistry.registerComponent(appName, () => withEssentials(essentials));
}
run();
