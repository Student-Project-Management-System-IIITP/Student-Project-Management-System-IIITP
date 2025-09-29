import { useState, useEffect } from 'react';
import { studentAPI } from '../utils/api';

export const useEvaluation = () => {
  const [evaluationSchedule, setEvaluationSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load evaluation schedule
  const loadEvaluationSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call to get evaluation schedule
      // For now, set to null so admin must set the schedule manually
      setEvaluationSchedule(null);
      
      // Uncomment below when admin API is ready:
      // const response = await studentAPI.getEvaluationSchedule();
      // setEvaluationSchedule(response.data);
    } catch (err) {
      setError(err.message);
      setEvaluationSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  // Get evaluation status for a specific project
  const getProjectEvaluationStatus = async (projectId) => {
    try {
      const status = await studentAPI.getSem4Status(projectId);
      return status.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Check if evaluation is scheduled
  const isEvaluationScheduled = () => {
    return evaluationSchedule && evaluationSchedule.status === 'scheduled';
  };

  // Check if evaluation dates are available
  const hasEvaluationDates = () => {
    return evaluationSchedule && evaluationSchedule.presentationDates.length > 0;
  };

  // Get next evaluation date
  const getNextEvaluationDate = () => {
    if (!hasEvaluationDates()) return null;
    
    const today = new Date();
    const upcomingDates = evaluationSchedule.presentationDates
      .filter(date => new Date(date.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return upcomingDates.length > 0 ? upcomingDates[0] : null;
  };

  // Get evaluation timeline
  const getEvaluationTimeline = () => {
    if (!evaluationSchedule) return [];

    const steps = [
      {
        title: 'Evaluation Scheduled',
        description: 'Admin has scheduled evaluation dates',
        status: 'completed',
        date: evaluationSchedule.createdAt,
      },
    ];

    if (hasEvaluationDates()) {
      const nextDate = getNextEvaluationDate();
      if (nextDate) {
        steps.push({
          title: 'Presentation Day',
          description: `Present your project on ${nextDate.date} at ${nextDate.time}`,
          status: new Date(nextDate.date) <= new Date() ? 'completed' : 'current',
          date: nextDate.date,
        });
      }
    }

    return steps;
  };

  // Get panel members
  const getPanelMembers = () => {
    if (!evaluationSchedule || !hasEvaluationDates()) return [];
    
    const nextDate = getNextEvaluationDate();
    return nextDate ? nextDate.panelMembers : [];
  };

  // Get presentation instructions
  const getInstructions = () => {
    return evaluationSchedule ? evaluationSchedule.instructions : [];
  };

  // Check if student can upload PPT
  const canUploadPPT = () => {
    return isEvaluationScheduled() && hasEvaluationDates();
  };

  useEffect(() => {
    loadEvaluationSchedule();
  }, []);

  return {
    evaluationSchedule,
    loading,
    error,
    loadEvaluationSchedule,
    getProjectEvaluationStatus,
    isEvaluationScheduled,
    hasEvaluationDates,
    getNextEvaluationDate,
    getEvaluationTimeline,
    getPanelMembers,
    getInstructions,
    canUploadPPT,
    setError,
  };
};
