import {
  createContext,
  useCallback,
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

  const resetDraft = useCallback(() => {
    setDraft(defaultDraft);
  }, []);

  const updateDraft = useCallback((input: Partial<OnboardingDraft>) => {
    setDraft((current) => ({
      ...current,
      ...input,
    }));
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      draft,
      resetDraft,
      updateDraft,
    }),
    [draft, resetDraft, updateDraft],
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
