import React, { useCallback, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWebViewPool } from "./WebViewPool";
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
  const pool = useWebViewPool();
  const state = useStoreState();
  const isFocused = useIsFocused();
  const slotIdRef = useRef<number | undefined>(preparedSlotId ?? pool.claimPrepared(screenName));
  const containerIdRef = useRef(`screen-container-${screenName}-${Date.now()}`);
  const mountedRef = useRef(false);

  const doAttach = useCallback(() => {
    const slot = slotIdRef.current;
    const mounted = mountedRef.current;
    const container = containerIdRef.current;
    if (slot == null || !mounted) {
      return;
    }
    pool.attach(slot, container).then((ok) => {
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
      pool.acquire().then(async (slotId) => {
        if (!mountedRef.current) {
          pool.release(slotId);
          return;
        }
        slotIdRef.current = slotId;
        await pool.injectScreen(slotId, screenName, JSON.stringify(state));
        if (mountedRef.current) {
          doAttach();
        }
      });
    }

    return () => {
      mountedRef.current = false;
      if (slotIdRef.current != null) {
        pool.release(slotIdRef.current);
        slotIdRef.current = undefined;
      }
    };
  }, []);

  const prevFocusedRef = useRef(isFocused);
  useEffect(() => {
    const becameFocused = isFocused && !prevFocusedRef.current;
    prevFocusedRef.current = isFocused;
    if (slotIdRef.current != null && becameFocused) {
      pool.injectScreen(slotIdRef.current, screenName, JSON.stringify(state));
    }
  }, [isFocused]);

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
