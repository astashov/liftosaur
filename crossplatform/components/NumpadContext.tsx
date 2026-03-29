import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import type { TextInput } from "react-native";

export interface INumpadFieldConfig {
  fieldId: string;
  mode: "integer" | "decimal";
  value: string;
  step: number;
  min?: number;
  max?: number;
  unit?: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onIncrement?: (current: number) => number;
  onDecrement?: (current: number) => number;
  inputRef?: RefObject<TextInput | null>;
  renderAddon?: () => ReactElement | null;
  enableRmCalculator?: boolean;
  onOpenRmCalculator?: () => void;
}

interface INumpadContextValue {
  activeField: INumpadFieldConfig | null;
  isActive: boolean;
  activateField: (config: INumpadFieldConfig) => void;
  deactivateField: (fieldId: string) => void;
  updateFieldConfig: (fieldId: string, updates: Partial<INumpadFieldConfig>) => void;
  dismiss: () => void;
}

const NumpadContext = createContext<INumpadContextValue | null>(null);

export function useNumpadContext(): INumpadContextValue {
  const ctx = useContext(NumpadContext);
  if (ctx == null) {
    throw new Error("useNumpadContext must be used within a NumpadProvider");
  }
  return ctx;
}

export function useNumpadContextOptional(): INumpadContextValue | null {
  return useContext(NumpadContext);
}

export function NumpadProvider(props: { children: ReactNode }): ReactElement {
  const [activeField, setActiveField] = useState<INumpadFieldConfig | null>(null);
  const switchingRef = useRef(false);
  const activeFieldRef = useRef<INumpadFieldConfig | null>(null);

  const activateField = useCallback((config: INumpadFieldConfig) => {
    switchingRef.current = false;
    activeFieldRef.current = config;
    setActiveField(config);
  }, []);

  const deactivateField = useCallback((fieldId: string) => {
    switchingRef.current = true;
    // Delay deactivation to allow another field's activateField to fire first.
    // If no new field activates within the frame, we actually deactivate.
    requestAnimationFrame(() => {
      if (switchingRef.current && activeFieldRef.current?.fieldId === fieldId) {
        activeFieldRef.current = null;
        setActiveField(null);
        switchingRef.current = false;
      }
    });
  }, []);

  const updateFieldConfig = useCallback((fieldId: string, updates: Partial<INumpadFieldConfig>) => {
    setActiveField((prev) => {
      if (prev == null || prev.fieldId !== fieldId) return prev;
      const next = { ...prev, ...updates };
      activeFieldRef.current = next;
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    const field = activeFieldRef.current;
    switchingRef.current = false;
    activeFieldRef.current = null;
    setActiveField(null);
    field?.onSubmit();
  }, []);

  const value: INumpadContextValue = {
    activeField,
    isActive: activeField != null,
    activateField,
    deactivateField,
    updateFieldConfig,
    dismiss,
  };

  return <NumpadContext.Provider value={value}>{props.children}</NumpadContext.Provider>;
}
