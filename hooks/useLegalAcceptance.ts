import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Policy, Terms } from '../types';

interface UseLegalAcceptanceReturn {
  pendingTerms: Terms[];
  pendingPolicies: Policy[];
  hasPendingItems: boolean;
  loading: boolean;
  error: string | null;
  checkPendingAcceptances: () => Promise<void>;
  acceptTerms: (termsId: string) => Promise<void>;
  acceptPolicy: (policyId: string) => Promise<void>;
}

export function useLegalAcceptance(): UseLegalAcceptanceReturn {
  const [pendingTerms, setPendingTerms] = useState<Terms[]>([]);
  const [pendingPolicies, setPendingPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPendingAcceptances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar termos e políticas pendentes
      const [termsResponse, policiesResponse] = await Promise.allSettled([
        api.getPendingTerms(),
        api.getPendingPolicies()
      ]);

      if (termsResponse.status === 'fulfilled' && termsResponse.value.success) {
        setPendingTerms(Array.isArray(termsResponse.value.data) ? termsResponse.value.data : []);
      }

      if (policiesResponse.status === 'fulfilled' && policiesResponse.value.success) {
        setPendingPolicies(Array.isArray(policiesResponse.value.data) ? policiesResponse.value.data : []);
      }

    } catch (err) {
      console.error('Erro ao verificar aceitações pendentes:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptTerms = useCallback(async (termsId: string) => {
    try {
      const response = await api.acceptTerms(termsId);
      
      if (response.success) {
        // Remove from pending list
        setPendingTerms(prev => prev.filter(term => term.id !== termsId));
      } else {
        throw new Error(response.message || 'Erro ao aceitar termos');
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao aceitar termos');
    }
  }, []);

  const acceptPolicy = useCallback(async (policyId: string) => {
    try {
      const response = await api.acceptPolicy({ policyId });
      
      if (response.success) {
        // Remove from pending list
        setPendingPolicies(prev => prev.filter(policy => policy.id !== policyId));
      } else {
        throw new Error(response.message || 'Erro ao aceitar política');
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao aceitar política');
    }
  }, []);

  useEffect(() => {
    checkPendingAcceptances();
  }, [checkPendingAcceptances]);

  const hasPendingItems = pendingTerms.length > 0 || pendingPolicies.length > 0;

  return {
    pendingTerms,
    pendingPolicies,
    hasPendingItems,
    loading,
    error,
    checkPendingAcceptances,
    acceptTerms,
    acceptPolicy,
  };
}