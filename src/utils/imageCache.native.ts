import RNFS from "react-native-fs";
import { StringUtils_hashString } from "./string";

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/exerciseimg`;
let dirEnsured = false;

const inFlight: Map<string, Promise<void>> = new Map();
const knownMissing: Set<string> = new Set();

function pathFor(remoteUrl: string): string {
  const m = remoteUrl.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  const ext = (m?.[1] ?? "png").toLowerCase();
  return `${CACHE_DIR}/${StringUtils_hashString(remoteUrl)}.${ext}`;
}

export function ImageCache_initialUri(remoteUrl: string): string {
  if (knownMissing.has(remoteUrl)) {
    return remoteUrl;
  }
  return `file://${pathFor(remoteUrl)}`;
}

export function ImageCache_markMissing(remoteUrl: string): void {
  knownMissing.add(remoteUrl);
}

export async function ImageCache_download(remoteUrl: string): Promise<void> {
  const path = pathFor(remoteUrl);
  const existing = inFlight.get(path);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    try {
      if (!dirEnsured) {
        await RNFS.mkdir(CACHE_DIR);
        dirEnsured = true;
      }
      if (await RNFS.exists(path)) {
        if (knownMissing.has(remoteUrl)) {
          await RNFS.unlink(path).catch(() => {});
        } else {
          return;
        }
      }
      const tmp = `${path}.part`;
      const { promise } = RNFS.downloadFile({ fromUrl: remoteUrl, toFile: tmp });
      const result = await promise;
      if (result.statusCode === 200) {
        await RNFS.moveFile(tmp, path);
        knownMissing.delete(remoteUrl);
      } else {
        await RNFS.unlink(tmp).catch(() => {});
      }
    } catch {
      // best-effort: leave knownMissing as-is so we keep using remote URL
    } finally {
      inFlight.delete(path);
    }
  })();
  inFlight.set(path, task);
  return task;
}
