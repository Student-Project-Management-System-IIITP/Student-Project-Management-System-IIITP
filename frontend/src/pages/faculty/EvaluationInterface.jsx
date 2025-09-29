import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { facultyAPI } from '../../utils/api';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';

const EvaluationInterface = () => {
  const { id: assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      technicalScore: '',
      presentationScore: '',
      innovationScore: '',
      documentationScore: '',
      overallScore: '',
      feedback: '',
      grade: '',
      recommendations: ''
    }
  });

  const technicalScore = watch('technicalScore');
  const presentationScore = watch('presentationScore');
  const innovationScore = watch('innovationScore');
  const documentationScore = watch('documentationScore');

  // Calculate overall score automatically
  useEffect(() => {
    const scores = [technicalScore, presentationScore, innovationScore, documentationScore]
      .map(score => parseFloat(score) || 0);
    
    if (scores.every(score => score > 0)) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      setValue('overallScore', average.toFixed(1));
    }
  }, [technicalScore, presentationScore, innovationScore, documentationScore, setValue]);

  // Load evaluation assignment data
  useEffect(() => {
    const loadAssignment = async () => {
      if (!assignmentId) {
        // Load all assignments if no specific ID
        try {
          setLoading(true);
          const response = await facultyAPI.getEvaluationAssignments();
          setAssignment(response.data || []);
        } catch (error) {
          toast.error('Failed to load evaluation assignments');
        } finally {
          setLoading(false);
        }
      } else {
        // Load specific assignment
        try {
          setLoading(true);
          const response = await facultyAPI.getEvaluationAssignments();
          const assignments = response.data || [];
          const specificAssignment = assignments.find(a => a._id === assignmentId);
          
          if (specificAssignment) {
            setAssignment(specificAssignment);
            setProject(specificAssignment.project);
            
            // Pre-fill form if already evaluated
            if (specificAssignment.evaluatedAt) {
              setValue('technicalScore', specificAssignment.technicalScore || '');
              setValue('presentationScore', specificAssignment.presentationScore || '');
              setValue('innovationScore', specificAssignment.innovationScore || '');
              setValue('documentationScore', specificAssignment.documentationScore || '');
              setValue('overallScore', specificAssignment.overallScore || '');
              setValue('feedback', specificAssignment.feedback || '');
              setValue('grade', specificAssignment.grade || '');
              setValue('recommendations', specificAssignment.recommendations || '');
            }
          } else {
            toast.error('Evaluation assignment not found');
            navigate('/faculty/evaluations');
          }
        } catch (error) {
          toast.error('Failed to load evaluation assignment');
        } finally {
          setLoading(false);
        }
      }
    };

    loadAssignment();
  }, [assignmentId, navigate, setValue]);

  const onSubmit = async (data) => {
    if (!assignment || !project) return;

    setSubmitting(true);
    try {
      await facultyAPI.evaluateProject(project._id, {
        technicalScore: parseFloat(data.technicalScore),
        presentationScore: parseFloat(data.presentationScore),
        innovationScore: parseFloat(data.innovationScore),
        documentationScore: parseFloat(data.documentationScore),
        overallScore: parseFloat(data.overallScore),
        feedback: data.feedback,
        grade: data.grade,
        recommendations: data.recommendations
      });

      toast.success('Project evaluated successfully!');
      navigate('/dashboard/faculty');
    } catch (error) {
      toast.error(error.message || 'Failed to evaluate project');
    } finally {
      setSubmitting(false);
    }
  };

  const getGradeFromScore = (score) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    return 'D';
  };

  // Auto-set grade based on overall score
  useEffect(() => {
    const overallScore = parseFloat(watch('overallScore'));
    if (overallScore > 0) {
      setValue('grade', getGradeFromScore(overallScore));
    }
  }, [watch('overallScore'), setValue]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading evaluation data...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no specific assignment ID, show list of assignments
  if (!assignmentId && Array.isArray(assignment)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Evaluation Assignments</h1>
          <p className="text-gray-600 mt-2">
            Your assigned projects for evaluation
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Evaluations</h2>
          </div>
          <div className="p-6">
            {assignment.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Evaluation Assignments</h3>
                <p className="text-gray-500">You don't have any evaluation assignments yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignment.map((assignmentItem) => (
                  <div key={assignmentItem._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {assignmentItem.project?.title || 'Project Title'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {assignmentItem.student?.fullName || 'Student Name'} • 
                        {assignmentItem.student?.rollNumber || 'Roll Number'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned: {new Date(assignmentItem.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <StatusBadge status={assignmentItem.evaluatedAt ? 'completed' : 'pending'} />
                      <button
                        onClick={() => navigate(`/faculty/evaluations/${assignmentItem._id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {assignmentItem.evaluatedAt ? 'Review' : 'Evaluate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Single assignment evaluation interface
  if (!assignment || !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assignment Not Found</h1>
          <p className="text-gray-600 mb-6">The evaluation assignment you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard/faculty')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Project Evaluation</h1>
        <p className="text-gray-600 mt-2">
          Evaluate: <strong>{project.title}</strong>
        </p>
      </div>

      {/* Project Information */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Project Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Title:</span> {project.title}</p>
                <p><span className="font-medium">Description:</span> {project.description}</p>
                <p><span className="font-medium">Type:</span> Minor Project 1</p>
                <p><span className="font-medium">Semester:</span> 4th Semester</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Student Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {assignment.student?.fullName || 'N/A'}</p>
                <p><span className="font-medium">Roll Number:</span> {assignment.student?.rollNumber || 'N/A'}</p>
                <p><span className="font-medium">Email:</span> {assignment.student?.collegeEmail || 'N/A'}</p>
                <p><span className="font-medium">Department:</span> {assignment.student?.department || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Evaluation Form</h2>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Scoring Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Scoring (Out of 100)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="technicalScore" className="block text-sm font-medium text-gray-700 mb-2">
                  Technical Implementation <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="technicalScore"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('technicalScore', { 
                    required: 'Technical score is required',
                    min: { value: 0, message: 'Score must be at least 0' },
                    max: { value: 100, message: 'Score must be at most 100' }
                  })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.technicalScore ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter score (0-100)"
                />
                {errors.technicalScore && (
                  <p className="mt-1 text-sm text-red-600">{errors.technicalScore.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="presentationScore" className="block text-sm font-medium text-gray-700 mb-2">
                  Presentation & Communication <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="presentationScore"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('presentationScore', { 
                    required: 'Presentation score is required',
                    min: { value: 0, message: 'Score must be at least 0' },
                    max: { value: 100, message: 'Score must be at most 100' }
                  })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.presentationScore ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter score (0-100)"
                />
                {errors.presentationScore && (
                  <p className="mt-1 text-sm text-red-600">{errors.presentationScore.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="innovationScore" className="block text-sm font-medium text-gray-700 mb-2">
                  Innovation & Creativity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="innovationScore"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('innovationScore', { 
                    required: 'Innovation score is required',
                    min: { value: 0, message: 'Score must be at least 0' },
                    max: { value: 100, message: 'Score must be at most 100' }
                  })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.innovationScore ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter score (0-100)"
                />
                {errors.innovationScore && (
                  <p className="mt-1 text-sm text-red-600">{errors.innovationScore.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="documentationScore" className="block text-sm font-medium text-gray-700 mb-2">
                  Documentation & Report <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="documentationScore"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('documentationScore', { 
                    required: 'Documentation score is required',
                    min: { value: 0, message: 'Score must be at least 0' },
                    max: { value: 100, message: 'Score must be at most 100' }
                  })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.documentationScore ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter score (0-100)"
                />
                {errors.documentationScore && (
                  <p className="mt-1 text-sm text-red-600">{errors.documentationScore.message}</p>
                )}
              </div>
            </div>

            {/* Overall Score (Auto-calculated) */}
            <div className="mt-4">
              <label htmlFor="overallScore" className="block text-sm font-medium text-gray-700 mb-2">
                Overall Score (Auto-calculated)
              </label>
              <input
                type="number"
                id="overallScore"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md shadow-sm"
                placeholder="Will be calculated automatically"
              />
            </div>
          </div>

          {/* Grade */}
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
              Grade <span className="text-red-500">*</span>
            </label>
            <select
              id="grade"
              {...register('grade', { required: 'Grade is required' })}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.grade ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select Grade</option>
              <option value="A+">A+ (90-100)</option>
              <option value="A">A (80-89)</option>
              <option value="B+">B+ (70-79)</option>
              <option value="B">B (60-69)</option>
              <option value="C+">C+ (50-59)</option>
              <option value="C">C (40-49)</option>
              <option value="D">D (Below 40)</option>
            </select>
            {errors.grade && (
              <p className="mt-1 text-sm text-red-600">{errors.grade.message}</p>
            )}
          </div>

          {/* Feedback */}
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Feedback <span className="text-red-500">*</span>
            </label>
            <textarea
              id="feedback"
              rows={4}
              {...register('feedback', { required: 'Feedback is required' })}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.feedback ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Provide detailed feedback on the project..."
            />
            {errors.feedback && (
              <p className="mt-1 text-sm text-red-600">{errors.feedback.message}</p>
            )}
          </div>

          {/* Recommendations */}
          <div>
            <label htmlFor="recommendations" className="block text-sm font-medium text-gray-700 mb-2">
              Recommendations for Improvement
            </label>
            <textarea
              id="recommendations"
              rows={3}
              {...register('recommendations')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Suggestions for future improvement..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/dashboard/faculty')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Evaluation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvaluationInterface;
