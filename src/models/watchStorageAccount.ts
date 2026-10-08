export function WatchStorageAccount_isOtherAccount(
  current: { tempUserId?: string },
  incoming: { tempUserId?: string }
): boolean {
  return current.tempUserId != null && incoming.tempUserId != null && current.tempUserId !== incoming.tempUserId;
}
