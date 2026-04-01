import { createContext, useContext } from "react";
import { Service } from "../api/service";

export interface IAppContext {
  service: Service;
  isApp?: boolean;
}

export const AppContext = createContext<Partial<IAppContext>>({});

export function useAppContext(): IAppContext {
  const ctx = useContext(AppContext);
  if (!ctx.service) {
    throw new Error("AppContext.service not provided");
  }
  return ctx as IAppContext;
}
