import type React from "react";
import type { IScreenName } from "./screenMap";

type IScreenComponent = React.ComponentType<{ route: { name: string; params?: unknown } }>;

const registry = new Map<IScreenName, IScreenComponent>();

export function MigratedScreens_register(name: IScreenName, component: IScreenComponent): void {
  registry.set(name, component);
}

export function MigratedScreens_get(name: IScreenName): IScreenComponent | undefined {
  return registry.get(name);
}

export function MigratedScreens_isMigrated(name: IScreenName): boolean {
  return registry.has(name);
}
