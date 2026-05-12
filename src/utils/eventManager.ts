export function EventManager_isAvailable(): boolean {
  return false;
}

export function EventManager_log(_data: string): void {
  // no-op on web; callers fall back to direct POST
}

export function EventManager_flush(): Promise<void> {
  return Promise.resolve();
}

export type IEventManagerTelemetryHandler = (event: {
  name: string;
  timestamp: number;
  extra: Record<string, string>;
}) => void;

export function EventManager_initTelemetry(_handler: IEventManagerTelemetryHandler): void {
  // no-op on web
}
