import { useCallback, useEffect, useState } from 'react';
import { studentAPI } from '../utils/api';

export const useMTechSem3Track = () => {
  const [trackChoice, setTrackChoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChoice = useCallback(async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getMTechSem3Choice();
      setTrackChoice(response?.data || null);
      setError(null);
    } catch (err) {
      setError(err);
      // For students outside Sem 3, keep choice null but avoid blocking UI
      setTrackChoice(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChoice();
  }, [fetchChoice]);

  const setChoice = useCallback(
    async (track) => {
      await studentAPI.setMTechSem3Choice(track);
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

