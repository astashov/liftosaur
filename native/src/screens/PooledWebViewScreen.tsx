import React, { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import {
  WebViewPool_acquire,
  WebViewPool_release,
  WebViewPool_injectScreen,
  WebViewPool_reparentTo,
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

  return <View nativeID={containerIdRef.current} style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
