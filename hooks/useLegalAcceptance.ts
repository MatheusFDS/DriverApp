import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Policy } from '../types';

interface UseLegalAcceptanceReturn {
  pendingPolicies: Policy[];
  hasPendingItems: boolean;
  loading: boolean;
  error: string | null;
  checkPendingAcceptances: () => Promise<void>;
  acceptPolicy: (policyId: string) => Promise<void>;
}

export function useLegalAcceptance(): UseLegalAcceptanceReturn {
  const [pendingPolicies, setPendingPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPendingAcceptances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar apenas políticas pendentes
      const policiesResponse = await api.getPendingPolicies();

      if (policiesResponse.success) {
        setPendingPolicies(Array.isArray(policiesResponse.data) ? policiesResponse.data : []);
      }

    } catch (err) {
      console.error('Erro ao verificar aceitações pendentes:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
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

  const hasPendingItems = pendingPolicies.length > 0;

  return {
    pendingPolicies,
    hasPendingItems,
    loading,
    error,
    checkPendingAcceptances,
    acceptPolicy,
  };
}