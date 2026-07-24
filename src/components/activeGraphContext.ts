import { createContext, useContext } from "react";

export interface IActiveGraphContext {
  activeId: string | null;
  setActive: (id: string | null) => void;
}

export const ActiveGraphContext = createContext<IActiveGraphContext>({
  activeId: null,
  setActive: () => undefined,
});

export function useActiveGraph(): IActiveGraphContext {
  return useContext(ActiveGraphContext);
}
