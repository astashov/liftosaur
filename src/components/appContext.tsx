import { createContext } from "react";
import { Service } from "../api/service";

export const AppContext = createContext<{
  service?: Service;
  isApp?: boolean;
}>({ service: undefined });
