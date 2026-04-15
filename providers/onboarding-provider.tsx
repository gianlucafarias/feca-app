import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { OnboardingDraft } from "@/types/feca";

type OnboardingContextValue = {
  draft: OnboardingDraft;
  resetDraft: () => void;
  updateDraft: (input: Partial<OnboardingDraft>) => void;
};

const defaultDraft: OnboardingDraft = {
  username: "",
  displayName: "",
  city: "",
  neighborhood: "",
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<OnboardingDraft>(defaultDraft);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      draft,
      resetDraft: () => setDraft(defaultDraft),
      updateDraft: (input) =>
        setDraft((current) => ({
          ...current,
          ...input,
        })),
    }),
    [draft],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  }

  return context;
}
