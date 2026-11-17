import { AppRegistry, Platform } from "react-native";
import resolveAssetSource from "react-native/Libraries/Image/resolveAssetSource";
import { App } from "./src/App.native";
import { name as appName } from "./app.json";
import { EmbeddedAssetSource_resolve } from "./src/utils/embeddedAssetSource";

resolveAssetSource.addCustomSourceTransformer((resolver) => EmbeddedAssetSource_resolve(resolver, Platform.OS));

AppRegistry.registerComponent(appName, () => App);
