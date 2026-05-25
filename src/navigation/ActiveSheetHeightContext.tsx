import { JSX, ReactNode, createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";

interface ISheetEntry {
  id: string;
  height: number;
}

interface IActiveSheetHeightContextValue {
  entries: ISheetEntry[];
  register: (id: string) => void;
  update: (id: string, height: number) => void;
  unregister: (id: string) => void;
}

const ActiveSheetHeightContext = createContext<IActiveSheetHeightContextValue>({
  entries: [],
  register: () => undefined,
  update: () => undefined,
  unregister: () => undefined,
});

export function ActiveSheetHeightProvider(props: { children: ReactNode }): JSX.Element {
  const [entries, setEntries] = useState<ISheetEntry[]>([]);
  const register = useCallback((id: string) => {
    setEntries((prev) => (prev.some((e) => e.id === id) ? prev : [...prev, { id, height: 0 }]));
  }, []);
  const update = useCallback((id: string, height: number) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1) {
        return prev;
      }
      if (prev[idx].height === height) {
        return prev;
      }
      const next = prev.slice();
      next[idx] = { id, height };
      return next;
    });
  }, []);
  const unregister = useCallback((id: string) => {
    setEntries((prev) => (prev.some((e) => e.id === id) ? prev.filter((e) => e.id !== id) : prev));
  }, []);
  const value = useMemo(() => ({ entries, register, update, unregister }), [entries, register, update, unregister]);
  return <ActiveSheetHeightContext.Provider value={value}>{props.children}</ActiveSheetHeightContext.Provider>;
}

export function useActiveSheetHeight(): number {
  const { entries } = useContext(ActiveSheetHeightContext);
  return entries.length > 0 ? entries[entries.length - 1].height : 0;
}

export function useReportSheetHeight(): (height: number) => void {
  const id = useId();
  const { register, update, unregister } = useContext(ActiveSheetHeightContext);
  useEffect(() => {
    register(id);
    return () => unregister(id);
  }, [id, register, unregister]);
  return useCallback((height: number) => update(id, height), [id, update]);
}
