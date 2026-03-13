// lib/planner-context.tsx
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { PlannerPreferences } from "@/lib/planner-engine";

interface PlannerContextValue {
  preferences: PlannerPreferences;
  setPreferences: (updater: (prev: PlannerPreferences) => PlannerPreferences) => void;
}

const DEFAULT_PREFS: PlannerPreferences = {
  mandatoryChainScore: 40,
};

const PlannerContext = createContext<PlannerContextValue>({
  preferences: DEFAULT_PREFS,
  setPreferences: () => {},
});

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<PlannerPreferences>(DEFAULT_PREFS);

  function setPreferences(updater: (prev: PlannerPreferences) => PlannerPreferences) {
    setPreferencesState(prev => updater(prev));
  }

  return (
    <PlannerContext.Provider value={{
      preferences,
      setPreferences,
    }}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlannerContext() {
  return useContext(PlannerContext);
}

export type { PlannerPreferences };
