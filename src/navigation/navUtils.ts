export function getNavigationService(): Promise<typeof import("./navigationService")> {
  return import("./navigationService");
}

export function getNavigationRef(): Promise<typeof import("./navigationRef")> {
  return import("./navigationRef");
}
