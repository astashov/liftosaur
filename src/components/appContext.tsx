import { createContext } from "preact";
import { Service } from "../api/service";

export const AppContext = createContext<{
  service?: Service;
}>({ service: undefined });
