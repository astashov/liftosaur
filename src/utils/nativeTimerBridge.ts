import { SendMessage_toAndroid, SendMessage_toIos } from "./sendMessage";

export type NativeTimerStartParams = {
  duration: number;
  title: string;
  subtitleHeader: string;
  subtitle: string;
  bodyHeader: string;
  body: string;
  volume: number;
  vibration: boolean;
  ignoreDoNotDisturb: boolean;
};

export function NativeTimerBridge_startTimer(params: NativeTimerStartParams): void {
  const obj = {
    type: "startTimer",
    duration: params.duration.toString(),
    title: params.title,
    subtitleHeader: params.subtitleHeader,
    subtitle: params.subtitle,
    bodyHeader: params.bodyHeader,
    body: params.body,
    ignoreDoNotDisturb: params.ignoreDoNotDisturb ? "true" : "false",
    vibration: params.vibration ? "true" : "false",
    volume: params.volume.toString(),
  };
  SendMessage_toIos(obj);
  SendMessage_toAndroid(obj);
}

export function NativeTimerBridge_stopTimer(): void {
  SendMessage_toIos({ type: "stopTimer" });
  SendMessage_toAndroid({ type: "stopTimer" });
}

export function NativeTimerBridge_playSound(volume: number, vibration: boolean): boolean {
  return (
    SendMessage_toIos({ type: "playSound", volume: `${volume}`, vibration: vibration ? "true" : "false" }) ||
    SendMessage_toAndroid({ type: "playSound", volume: `${volume}`, vibration: vibration ? "true" : "false" })
  );
}

export function NativeTimerBridge_subscribeOnScheduled(_handler: () => void): () => void {
  // Web/WebView path: app.tsx already listens for window.postMessage({type:"timerScheduled"})
  // and sets nativeNotificationScheduled. This subscription is a no-op for symmetry with .native.
  return () => {};
}
