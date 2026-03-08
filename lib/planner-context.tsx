// lib/planner-context.tsx
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { PdfKnowledge } from "@/components/upload/UniversalUploader";
import type { PlannerPreferences } from "@/lib/planner-engine";

interface PlannerContextValue {
  pdfKnowledge: PdfKnowledge | null;
  setPdfKnowledge: (k: PdfKnowledge | null) => void;
  preferences: PlannerPreferences;
  setPreferences: (updater: (prev: PlannerPreferences) => PlannerPreferences) => void;
  hasPdf: boolean;
}

const DEFAULT_PREFS: PlannerPreferences = {
  mandatoryChainScore: 40,
};

const PlannerContext = createContext<PlannerContextValue>({
  pdfKnowledge: null,
  setPdfKnowledge: () => {},
  preferences: DEFAULT_PREFS,
  setPreferences: () => {},
  hasPdf: false,
});

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [pdfKnowledge, setPdfKnowledge] = useState<PdfKnowledge | null>(null);
  const [preferences, setPreferencesState] = useState<PlannerPreferences>(DEFAULT_PREFS);

  function setPreferences(updater: (prev: PlannerPreferences) => PlannerPreferences) {
    setPreferencesState(prev => updater(prev));
  }

  return (
    <PlannerContext.Provider value={{
      pdfKnowledge,
      setPdfKnowledge,
      preferences,
      setPreferences,
      hasPdf: pdfKnowledge !== null,
    }}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlannerContext() {
  return useContext(PlannerContext);
}

export type { PdfKnowledge, PlannerPreferences };
