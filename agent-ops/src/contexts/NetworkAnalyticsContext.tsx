import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { networkService, NetworkAnalyticsSummary } from '../services/networkService';

interface NetworkAnalyticsContextType {
  analytics: NetworkAnalyticsSummary | null;
  isLoading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
  lastUpdated: Date | null;
}

const NetworkAnalyticsContext = createContext<NetworkAnalyticsContextType | undefined>(undefined);

interface NetworkAnalyticsProviderProps {
  children: ReactNode;
}

export function NetworkAnalyticsProvider({ children }: NetworkAnalyticsProviderProps) {
  const [analytics, setAnalytics] = useState<NetworkAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const data = await networkService.getAnalyticsSummary();
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      console.warn('NetworkAnalyticsContext: Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAnalytics = useCallback(async () => {
    setIsLoading(true);
    await fetchAnalytics();
  }, [fetchAnalytics]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const value: NetworkAnalyticsContextType = {
    analytics,
    isLoading,
    error,
    refreshAnalytics,
    lastUpdated
  };

  return (
    <NetworkAnalyticsContext.Provider value={value}>
      {children}
    </NetworkAnalyticsContext.Provider>
  );
}

export function useNetworkAnalytics() {
  const context = useContext(NetworkAnalyticsContext);
  if (context === undefined) {
    throw new Error('useNetworkAnalytics must be used within a NetworkAnalyticsProvider');
  }
  return context;
} 