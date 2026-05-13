import NativeLiftosaurShare from "../specs/NativeLiftosaurShare";

export async function ShareLog_share(): Promise<void> {
  try {
    await NativeLiftosaurShare.shareLog();
  } catch (e) {
    console.warn("ShareLog_share failed", e);
  }
}
