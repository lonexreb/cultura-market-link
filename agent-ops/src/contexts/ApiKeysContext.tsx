import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, ApiKeyData } from '../services/apiService';

export interface ApiKeys {
  gemini?: string;
  vapi?: string;
  claude4?: string;
  groqllama?: string;
}

// Using ApiKeyData from apiService instead

interface ApiKeysContextType {
  apiKeys: ApiKeys;
  backendKeys: ApiKeyData[];
  isLoading: boolean;
  updateApiKey: (nodeType: keyof ApiKeys, key: string) => Promise<void>;
  getApiKey: (nodeType: keyof ApiKeys) => string;
  loadApiKeys: () => Promise<void>;
  saveToBackend: (nodeType: keyof ApiKeys, key: string, name?: string) => Promise<boolean>;
  deleteApiKey: (keyId: string) => Promise<void>;
}

const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

// Hardcoded API keys as fallback
const HARDCODED_KEYS: ApiKeys = {
  groqllama: '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'
};

// Map frontend node types to backend providers
const PROVIDER_MAPPING: Record<keyof ApiKeys, string> = {
  gemini: 'google',
  claude4: 'anthropic',
  groqllama: 'groq',
  vapi: 'vapi'
};

export const useApiKeys = () => {
  const context = useContext(ApiKeysContext);
  if (context === undefined) {
    throw new Error('useApiKeys must be used within an ApiKeysProvider');
  }
  return context;
};

export const ApiKeysProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => {
    // Load from localStorage as fallback
    const stored = localStorage.getItem('api-keys');
    return stored ? { ...HARDCODED_KEYS, ...JSON.parse(stored) } : HARDCODED_KEYS;
  });
  const [backendKeys, setBackendKeys] = useState<ApiKeyData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getApiKeys();
      setBackendKeys(response);
      
      // Update local state with backend keys
      const backendApiKeys: Partial<ApiKeys> = {};
      response.forEach(key => {
        // Find the frontend key that matches this backend provider
        const frontendKey = Object.entries(PROVIDER_MAPPING).find(
          ([_, provider]) => provider === key.provider
        );
        if (frontendKey) {
          const [nodeType] = frontendKey;
          backendApiKeys[nodeType as keyof ApiKeys] = '***backend***'; // Placeholder
        }
      });
      
      setApiKeys(prev => ({ ...prev, ...backendApiKeys }));
    } catch (error) {
      console.warn('Failed to load API keys from backend, using local storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToBackend = async (nodeType: keyof ApiKeys, key: string, name?: string): Promise<boolean> => {
    try {
      const provider = PROVIDER_MAPPING[nodeType];
      if (!provider) {
        console.error(`No provider mapping found for ${nodeType}`);
        return false;
      }

      await apiService.saveApiKey(provider, key, name || `${nodeType} API Key`);

      await loadApiKeys(); // Reload to get updated list
      return true;
    } catch (error) {
      console.error('Failed to save API key to backend:', error);
      return false;
    }
  };

  const updateApiKey = async (nodeType: keyof ApiKeys, key: string) => {
    // Update local state immediately
    setApiKeys(prev => ({
      ...prev,
      [nodeType]: key
    }));

    // Save to localStorage as fallback
    const newKeys = { ...apiKeys, [nodeType]: key };
    localStorage.setItem('api-keys', JSON.stringify(newKeys));

    // Try to save to backend
    const saved = await saveToBackend(nodeType, key);
    if (!saved) {
      console.warn(`Failed to save ${nodeType} key to backend, kept in local storage`);
    }
  };

  const getApiKey = (nodeType: keyof ApiKeys) => {
    return apiKeys[nodeType] || '';
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      await apiService.deleteApiKey(keyId);
      await loadApiKeys(); // Reload to get updated list
    } catch (error) {
      console.error('Failed to delete API key:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  const value = {
    apiKeys,
    backendKeys,
    isLoading,
    updateApiKey,
    getApiKey,
    loadApiKeys,
    saveToBackend,
    deleteApiKey
  };

  return (
    <ApiKeysContext.Provider value={value}>
      {children}
    </ApiKeysContext.Provider>
  );
}; 