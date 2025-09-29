import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useEvaluation } from '../../hooks/useEvaluation';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/common/StatusBadge';

const EvaluationManagement = () => {
  const { evaluationSchedule, facultyList, setAdminEvaluationSchedule, assignAdminEvaluationPanel } = useEvaluation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm({
    defaultValues: {
      date: '',
      time: '',
      venue: '',
      duration: '20', // 15 min presentation + 5 min Q&A
      instructions: '',
      panelMembers: []
    }
  });

  const panelMembers = watch('panelMembers');

  // Load evaluation schedule and faculty list
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Data will be loaded by the useEvaluation hook
      } catch (error) {
        toast.error('Failed to load evaluation data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const onSubmitSchedule = async (data) => {
    setSubmitting(true);
    try {
      await setAdminEvaluationSchedule({
        presentationDates: [{
          date: data.date,
          time: data.time,
          venue: data.venue,
          duration: `${data.duration} minutes`,
          instructions: data.instructions.split('\n').filter(i => i.trim()),
          panelMembers: data.panelMembers.map((memberId, index) => {
            const faculty = facultyList.find(f => f._id === memberId);
            return {
              _id: memberId,
              name: faculty?.fullName || 'Unknown',
              department: faculty?.department || 'Unknown',
              role: index === 0 ? 'Chair' : 'Member'
            };
          })
        }]
      });
      
      toast.success('Evaluation schedule set successfully!');
      reset();
    } catch (error) {
      toast.error(error.message || 'Failed to set evaluation schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitPanel = async (data) => {
    setSubmitting(true);
    try {
      await assignAdminEvaluationPanel({
        projectIds: [], // Will be set for all active projects
        panelMembers: data.panelMembers.map((memberId, index) => {
          const faculty = facultyList.find(f => f._id === memberId);
          return {
            _id: memberId,
            name: faculty?.fullName || 'Unknown',
            department: faculty?.department || 'Unknown',
            role: index === 0 ? 'Chair' : 'Member'
          };
        })
      });
      
      toast.success('Evaluation panel assigned successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to assign evaluation panel');
    } finally {
      setSubmitting(false);
    }
  };

  const addPanelMember = () => {
    const currentMembers = panelMembers || [];
    setValue('panelMembers', [...currentMembers, '']);
  };

  const removePanelMember = (index) => {
    const currentMembers = panelMembers || [];
    setValue('panelMembers', currentMembers.filter((_, i) => i !== index));
  };

  const updatePanelMember = (index, value) => {
    const currentMembers = panelMembers || [];
    const newMembers = [...currentMembers];
    newMembers[index] = value;
    setValue('panelMembers', newMembers);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading evaluation data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Evaluation Management</h1>
        <p className="text-gray-600 mt-2">
          Manage B.Tech Semester 4 Minor Project 1 evaluations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Set Evaluation Schedule */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Set Evaluation Schedule</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmitSchedule)} className="p-6 space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Presentation Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  {...register('date', { required: 'Date is required' })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="time"
                  {...register('time', { required: 'Time is required' })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.time ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.time && (
                  <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
                )}
              </div>
            </div>

            {/* Venue and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="venue"
                  {...register('venue', { required: 'Venue is required' })}
                  placeholder="e.g., Seminar Hall 1, Lab 201"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.venue ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.venue && (
                  <p className="mt-1 text-sm text-red-600">{errors.venue.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Duration (minutes)
                </label>
                <select
                  id="duration"
                  {...register('duration')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="15">15 minutes (10 min presentation + 5 min Q&A)</option>
                  <option value="20">20 minutes (15 min presentation + 5 min Q&A)</option>
                  <option value="25">25 minutes (20 min presentation + 5 min Q&A)</option>
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                Instructions for Students
              </label>
              <textarea
                id="instructions"
                rows={4}
                {...register('instructions')}
                placeholder="Enter instructions for students (one per line)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Each line will be displayed as a separate instruction
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {submitting ? 'Setting Schedule...' : 'Set Evaluation Schedule'}
            </button>
          </form>
        </div>

        {/* Assign Evaluation Panel */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Assign Evaluation Panel</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmitPanel)} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Panel Members <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select 3 faculty members for the evaluation panel (first member will be the chair)
              </p>
              
              {(panelMembers || []).map((memberId, index) => (
                <div key={index} className="flex items-center space-x-3 mb-3">
                  <select
                    value={memberId}
                    onChange={(e) => updatePanelMember(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select faculty member</option>
                    {facultyList.map((faculty) => (
                      <option key={faculty._id} value={faculty._id}>
                        {faculty.fullName} ({faculty.department}) - {faculty.designation}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removePanelMember(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {(panelMembers || []).length < 3 && (
                <button
                  type="button"
                  onClick={addPanelMember}
                  className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800"
                >
                  + Add Panel Member
                </button>
              )}

              {(panelMembers || []).length === 0 && (
                <p className="text-sm text-gray-500">No panel members selected</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || (panelMembers || []).length !== 3}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {submitting ? 'Assigning Panel...' : 'Assign Evaluation Panel'}
            </button>
          </form>
        </div>
      </div>

      {/* Current Evaluation Schedule */}
      {evaluationSchedule && (
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Current Evaluation Schedule</h2>
          </div>
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-3">Active Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Date:</span>
                  <span className="ml-2">{evaluationSchedule.presentationDates[0]?.date}</span>
                </div>
                <div>
                  <span className="font-medium">Time:</span>
                  <span className="ml-2">{evaluationSchedule.presentationDates[0]?.time}</span>
                </div>
                <div>
                  <span className="font-medium">Venue:</span>
                  <span className="ml-2">{evaluationSchedule.presentationDates[0]?.venue}</span>
                </div>
                <div>
                  <span className="font-medium">Duration:</span>
                  <span className="ml-2">{evaluationSchedule.presentationDates[0]?.duration}</span>
                </div>
              </div>
              
              {evaluationSchedule.presentationDates[0]?.panelMembers && (
                <div className="mt-4">
                  <span className="font-medium text-green-900">Evaluation Panel:</span>
                  <div className="mt-2 space-y-2">
                    {evaluationSchedule.presentationDates[0].panelMembers.map((member, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <StatusBadge 
                          status={member.role === 'Chair' ? 'scheduled' : 'registered'} 
                          text={member.role}
                        />
                        <span className="text-sm">{member.name} ({member.department})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evaluationSchedule.presentationDates[0]?.instructions && (
                <div className="mt-4">
                  <span className="font-medium text-green-900">Instructions:</span>
                  <ul className="mt-2 space-y-1">
                    {evaluationSchedule.presentationDates[0].instructions.map((instruction, index) => (
                      <li key={index} className="text-sm text-green-800">• {instruction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationManagement;
