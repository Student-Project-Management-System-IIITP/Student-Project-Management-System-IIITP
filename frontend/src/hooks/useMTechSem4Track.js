import { useCallback, useEffect, useState } from 'react';
import { studentAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const useMTechSem4Track = () => {
  const { roleData } = useAuth();
  const [trackChoice, setTrackChoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const shouldFetch = roleData?.degree === 'M.Tech' && (roleData?.semester >= 4);

  const fetchChoice = useCallback(async () => {
    if (!shouldFetch) {
      setLoading(false);
      setTrackChoice(null);
      return;
    }

    try {
      setLoading(true);
      const response = await studentAPI.getMTechSem4Choice();
      setTrackChoice(response?.data || null);
      setError(null);
    } catch (err) {
      setError(err);
      setTrackChoice(null);
    } finally {
      setLoading(false);
    }
  }, [shouldFetch]);

  useEffect(() => {
    fetchChoice();
  }, [fetchChoice]);

  const setChoice = useCallback(
    async (track) => {
      await studentAPI.setMTechSem4Choice(track);
      await fetchChoice();
    },
    [fetchChoice]
  );

  return {
    trackChoice,
    loading,
    error,
    refresh: fetchChoice,
    setChoice,
  };
};
