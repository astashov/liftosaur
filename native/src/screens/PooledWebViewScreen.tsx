import React, { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import {
  WebViewPool_acquire,
  WebViewPool_release,
  WebViewPool_injectScreen,
  WebViewPool_reparentTo,
  WebViewPool_sendState,
  WebViewPool_prepareScreen,
  WebViewPool_claimPrepared,
} from "./WebViewPool";
import { useStoreState } from "../context/StoreContext";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { IScreenName } from "../navigation/screenMap";
import { tabScreens, screenToTab } from "../navigation/screenMap";

interface IRouteParams {
  preparedSlotId?: number;
}

interface IProps {
  route: { name: string; params?: IRouteParams };
}

export function PooledWebViewScreen({ route }: IProps): React.ReactElement {
  const screenName = route.name as IScreenName;
  const preparedSlotId = route.params?.preparedSlotId;
  const state = useStoreState();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const slotIdRef = useRef<number | undefined>(preparedSlotId ?? WebViewPool_claimPrepared(screenName));
  const containerIdRef = useRef(`screen-container-${screenName}-${Date.now()}`);
  const mountedRef = useRef(false);

  const doReparent = useCallback(() => {
    const slot = slotIdRef.current;
    const mounted = mountedRef.current;
    const container = containerIdRef.current;
    if (slot == null || !mounted) {
      console.log(`[Pool] doReparent skip slot=${slot} mounted=${mounted}`);
      return;
    }
    WebViewPool_reparentTo(slot, container).then((ok) => {
      console.log(`[Pool] reparent slot=${slot} container=${container} ok=${ok}`);
      if (!ok && mountedRef.current) {
        setTimeout(() => doReparent(), 50);
      }
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (slotIdRef.current != null) {
      doReparent();
    } else {
      WebViewPool_acquire(containerIdRef.current).then(async (slotId) => {
        if (!mountedRef.current) {
          WebViewPool_release(slotId);
          return;
        }
        slotIdRef.current = slotId;
        await WebViewPool_injectScreen(slotId, screenName, JSON.stringify(state));
        if (mountedRef.current) {
          doReparent();
        }
      });
    }

    return () => {
      mountedRef.current = false;
      if (slotIdRef.current != null) {
        WebViewPool_release(slotIdRef.current);
        slotIdRef.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (slotIdRef.current != null && isFocused) {
      WebViewPool_sendState(slotIdRef.current, JSON.stringify(state));
    }
  }, [state, isFocused]);

  const tab = screenToTab[screenName];
  const screensInTab = tabScreens[tab];
  const nextScreen = screensInTab.find((s) => s !== screenName);

  const handlePush = async (target: IScreenName): Promise<void> => {
    const slotId = await WebViewPool_prepareScreen(
      `screen-container-${target}-${Date.now()}`,
      target,
      JSON.stringify(state)
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation as any).push(target, { preparedSlotId: slotId });
  };

  return (
    <View style={styles.container}>
      <View nativeID={containerIdRef.current} style={styles.webview} />
      {nextScreen != null && (
        <View style={styles.buttonOverlay} pointerEvents="box-none">
          <TouchableOpacity style={styles.testButton} onPress={() => handlePush(nextScreen)}>
            <Text style={styles.testButtonText}>Push: {nextScreen}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  buttonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 20,
    paddingBottom: 100,
  },
  testButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  testButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
