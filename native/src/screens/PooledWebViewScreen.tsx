import React, { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  WebViewPool_acquire,
  WebViewPool_release,
  WebViewPool_injectScreen,
  WebViewPool_attach,
  WebViewPool_sendState,
  WebViewPool_claimPrepared,
} from "./WebViewPool";
import { useStoreState } from "../context/StoreContext";
import { useIsFocused } from "@react-navigation/native";
import type { IScreenName } from "../navigation/screenMap";

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
  const slotIdRef = useRef<number | undefined>(preparedSlotId ?? WebViewPool_claimPrepared(screenName));
  const containerIdRef = useRef(`screen-container-${screenName}-${Date.now()}`);
  const mountedRef = useRef(false);

  const doAttach = useCallback(() => {
    const slot = slotIdRef.current;
    const mounted = mountedRef.current;
    const container = containerIdRef.current;
    if (slot == null || !mounted) {
      return;
    }
    WebViewPool_attach(slot, container).then((ok) => {
      if (!ok && mountedRef.current) {
        setTimeout(() => doAttach(), 50);
      }
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (slotIdRef.current != null) {
      doAttach();
    } else {
      WebViewPool_acquire().then(async (slotId) => {
        if (!mountedRef.current) {
          WebViewPool_release(slotId);
          return;
        }
        slotIdRef.current = slotId;
        await WebViewPool_injectScreen(slotId, screenName, JSON.stringify(state));
        if (mountedRef.current) {
          doAttach();
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

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View nativeID={containerIdRef.current} style={styles.container} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    flex: 1,
  },
});
