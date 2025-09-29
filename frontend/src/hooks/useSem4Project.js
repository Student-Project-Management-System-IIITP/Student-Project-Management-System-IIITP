import { useState, useEffect, useCallback } from 'react';
import { studentAPI } from '../utils/api';

export const useSem4Project = () => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load Sem 4 project
  const loadProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await studentAPI.getProjects();
      const projects = response.data || []; // Extract projects array from response, ensure it's an array
      const sem4Project = projects.find(p => p.semester === 4 && p.projectType === 'minor1');
      setProject(sem4Project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Register new project
  const registerProject = async (projectData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await studentAPI.registerProject(projectData);
      setProject(result.data);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update project
  const updateProject = async (projectId, data) => {
    setLoading(true);
    setError(null);
    try {
      const result = await studentAPI.updateProject(projectId, data);
      setProject(result.data);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get project status
  const getProjectStatus = useCallback(async (projectId) => {
    try {
      const result = await studentAPI.getSem4Status(projectId);
      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Check if student can register project
  const canRegisterProject = () => {
    return !project && !loading;
  };

  // Check if student can upload PPT
  const canUploadPPT = () => {
    // For Minor Project 1, treat both 'registered' and 'active' statuses as valid for upload
    return project && (project.status === 'active' || project.status === 'registered') && !loading;
  };

  // Get project timeline steps
  const getProjectTimeline = () => {
    if (!project) return [];

    const steps = [
      {
        title: 'Project Registration',
        description: 'Register your Minor Project 1',
        status: project.status === 'registered' ? 'completed' : 'pending',
        date: project.createdAt,
      },
    ];

    if (project.status !== 'registered') {
      steps.push({
        title: 'Project Active',
        description: 'Start working on your project',
        status: project.status === 'active' ? 'completed' : 'current',
        date: project.startDate,
      });
    }

    if (project.status === 'completed') {
      steps.push({
        title: 'Project Completed',
        description: 'Project submitted and evaluated',
        status: 'completed',
        date: project.evaluatedAt,
      });
    }

    return steps;
  };

  useEffect(() => {
    loadProject();
  }, []);

  return {
    project,
    loading,
    error,
    loadProject,
    registerProject,
    updateProject,
    getProjectStatus,
    canRegisterProject,
    canUploadPPT,
    getProjectTimeline,
    setError,
  };
};
