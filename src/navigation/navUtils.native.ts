import * as navigationServiceModule from "./navigationService";
import * as navigationRefModule from "./navigationRef";

export function getNavigationService(): Promise<typeof navigationServiceModule> {
  return Promise.resolve(navigationServiceModule);
}

export function getNavigationRef(): Promise<typeof navigationRefModule> {
  return Promise.resolve(navigationRefModule);
}
