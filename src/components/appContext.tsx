import { createContext } from "preact";
import { Service } from "../api/service";

export const AppContext = createContext<{
  service?: Service;
  isApp?: boolean;
}>({ service: undefined });
