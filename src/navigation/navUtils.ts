export function getNavigationService(): Promise<typeof import("./navigationService")> {
  return import("./navigationService");
}

export function getNavigationRef(): Promise<typeof import("./navigationRef")> {
  return import("./navigationRef");
}

export function getNavigationContext(): Promise<typeof import("@react-navigation/native")["NavigationContext"]> {
  return import("@react-navigation/native").then((mod) => mod.NavigationContext);
}
