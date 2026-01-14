import { useState, useEffect } from 'react';

const ONBOARDING_STORAGE_KEY = 'dash26_onboarding_completed';

export const useOnboarding = () => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    setHasCompletedOnboarding(completed === 'true');
    setIsLoading(false);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setHasCompletedOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setHasCompletedOnboarding(false);
  };

  const shouldShowOnboarding = !isLoading && !hasCompletedOnboarding;

  return {
    hasCompletedOnboarding,
    shouldShowOnboarding,
    completeOnboarding,
    resetOnboarding,
    isLoading,
  };
};
