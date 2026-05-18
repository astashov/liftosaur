export function ImageCache_initialUri(remoteUrl: string): string {
  return remoteUrl;
}

export function ImageCache_markMissing(_remoteUrl: string): void {}

export async function ImageCache_download(_remoteUrl: string): Promise<void> {}
