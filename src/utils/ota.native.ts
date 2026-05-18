import { Platform } from "react-native";
import NativeLftUpdater from "../specs/NativeLftUpdater";

interface IRollbarShim {
  info?: (msg: string, extra?: unknown) => void;
  warning?: (msg: string, extra?: unknown) => void;
  warn?: (msg: string, extra?: unknown) => void;
}

function getRollbar(): IRollbarShim | undefined {
  return (globalThis as unknown as { Rollbar?: IRollbarShim }).Rollbar;
}

function logRollbarInfo(msg: string, extra?: unknown): void {
  getRollbar()?.info?.(msg, extra);
}

function logRollbarWarn(msg: string, extra?: unknown): void {
  const r = getRollbar();
  (r?.warning ?? r?.warn)?.(msg, extra);
}

// Cached for synchronous reads from the Rollbar frame-rewrite transform.
// Populated by Ota_init(); a kick-off promise also fires at module load so
// uncaught errors very early in the launch still get a best-effort label.
let cachedActiveBundleId: string | null = null;
NativeLftUpdater.activeBundleId()
  .then((id) => {
    cachedActiveBundleId = id;
  })
  .catch(() => {});

export function Ota_activeBundleIdSync(): string | null {
  return cachedActiveBundleId;
}

export async function Ota_init(): Promise<void> {
  if (__DEV__) {
    return;
  }

  cachedActiveBundleId = await NativeLftUpdater.activeBundleId();

  setTimeout(() => {
    NativeLftUpdater.markLaunchSuccessful().catch(() => {});
  }, 5000);

  try {
    const result = await NativeLftUpdater.checkAndDownload();
    const status = result?.status ?? "unknown";
    if (status === "updated") {
      logRollbarInfo("OTA bundle downloaded", { updateId: result.updateId, platform: Platform.OS });
    } else if (status === "error") {
      logRollbarWarn("OTA check failed", { error: result.error, platform: Platform.OS });
    }
  } catch (e) {
    logRollbarWarn("OTA exception", { error: String(e), platform: Platform.OS });
  }
}

export async function Ota_activeBundleId(): Promise<string | null> {
  return NativeLftUpdater.activeBundleId();
}

export async function Ota_revertToEmbedded(): Promise<void> {
  return NativeLftUpdater.revertToEmbedded();
}
