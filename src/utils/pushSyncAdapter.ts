export interface IPushIdentity {
  userId: string;
  deviceId: string;
}

export interface IPushSync {
  start(args: {
    identity: IPushIdentity | undefined;
    getLocalOriginalId: () => number | undefined;
    onSync: (done: () => void) => void;
  }): () => void;
  setIdentity(identity: IPushIdentity | undefined): void;
  unregisterBeforeSignout(): Promise<void>;
}
