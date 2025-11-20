import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSem8Project } from '../../hooks/useSem8Project';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';

const Sem8TrackSelection = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  const { 
    trackChoice, 
    finalizedTrack, 
    trackChoiceStatus,
    canChooseTrack,
    setSem8Choice,
    studentType,
    loading 
  } = useSem8Project();

  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [windowStatus, setWindowStatus] = useState(null);

  // Check if student is in Sem 8 and is Type 2
  useEffect(() => {
    const currentSemester = roleData?.semester || user?.semester;
    if (currentSemester !== 8) {
      toast.error('Semester 8 track selection is only available for Semester 8 students');
      navigate('/dashboard/student');
      return;
    }
    
    // Type 1 students are auto-enrolled and shouldn't access this page
    if (studentType === 'type1') {
      toast.error('Type 1 students are automatically enrolled in coursework. Track selection is not required.');
      navigate('/dashboard/student');
    }
  }, [roleData, user, navigate, studentType]);

  // Load window status
  useEffect(() => {
    const checkWindow = async () => {
      try {
        const response = await studentAPI.getSystemConfig('sem8.choiceWindow');
        if (response.success && response.data) {
          setWindowStatus(response.data);
        }
      } catch (error) {
        // Config not found (404) or other error - window might not be configured yet
        // Fail open: allow access even if config doesn't exist
        // Only log non-404 errors to avoid console noise
        if (error.message && !error.message.includes('404') && !error.message.includes('not found')) {
          console.error('Failed to check window status:', error);
        }
      }
    };
    checkWindow();
  }, []);

  // Initialize selected track from existing choice
  useEffect(() => {
    if (trackChoice?.chosenTrack) {
      setSelectedTrack(trackChoice.chosenTrack);
    }
  }, [trackChoice]);

  const handleTrackSelect = (track) => {
    if (finalizedTrack) {
      toast.error('Your track has been finalized by admin and cannot be changed');
      return;
    }
    setSelectedTrack(track);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTrack) {
      toast.error('Please select a track');
      return;
    }

    if (finalizedTrack) {
      toast.error('Your track has been finalized by admin and cannot be changed');
      return;
    }

    setIsSubmitting(true);
    try {
      await setSem8Choice(selectedTrack);
      if (selectedTrack === 'internship') {
        toast.success('Track selected. Please submit your 6-month internship application.');
        navigate('/student/sem8/internship/apply/6month');
      } else {
        toast.success('Track selected. Proceed with Major Project 2 registration.');
        navigate('/dashboard/student');
      }
    } catch (error) {
      toast.error(`Failed to submit track choice: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if window is open
  const isWindowOpen = () => {
    if (!windowStatus || !windowStatus.value) return true; // Default to open if no config
    try {
      const windowData = typeof windowStatus.value === 'string' 
        ? JSON.parse(windowStatus.value) 
        : windowStatus.value;
      const now = new Date();
      const start = windowData.start ? new Date(windowData.start) : null;
      const end = windowData.end ? new Date(windowData.end) : null;
      
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    } catch (e) {
      return true; // Default to open on parse error
    }
  };

  const getStatusBadge = () => {
    if (!trackChoice) return null;
    
    const status = trackChoice.verificationStatus || 'pending';
    const statusMap = {
      pending: { status: 'warning', text: 'Pending Verification' },
      needs_info: { status: 'error', text: 'Needs More Information' },
      approved: { status: 'success', text: 'Approved' },
      rejected: { status: 'error', text: 'Rejected' }
    };

    return <StatusBadge status={statusMap[status]?.status || 'warning'} text={statusMap[status]?.text || 'Pending'} />;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const windowOpen = isWindowOpen();
  const canChooseTrackValue = (typeof canChooseTrack === 'function' ? canChooseTrack() : canChooseTrack);
  const canSubmit = canChooseTrackValue && windowOpen && !finalizedTrack;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Semester 8 Track Selection</h1>
          <p className="text-gray-600">
            Choose between a 6-month internship or Major Project 2 for this semester
          </p>
        </div>

        {/* Current Status */}
        {trackChoice && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Current Status</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Selected Track: <span className="font-medium">{trackChoice.chosenTrack === 'internship' ? '6-Month Internship' : 'Major Project 2'}</span>
                </p>
                {trackChoice.finalizedTrack && (
                  <p className="text-sm text-gray-600 mt-1">
                    Finalized Track: <span className="font-medium">{trackChoice.finalizedTrack === 'internship' ? '6-Month Internship' : 'Major Project 2'}</span>
                  </p>
                )}
              </div>
              {getStatusBadge()}
            </div>
            
            {trackChoice.adminRemarks && (
              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700">Admin Remarks:</p>
                <p className="text-sm text-gray-600 mt-1">{trackChoice.adminRemarks}</p>
              </div>
            )}
          </div>
        )}

        {/* Window Status */}
        {!windowOpen && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              The track selection window is currently closed. Please contact admin for more information.
            </p>
          </div>
        )}

        {/* Track Selection Form */}
        {canSubmit && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 6-Month Internship Option */}
              <div
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedTrack === 'internship'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleTrackSelect('internship')}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="track"
                    value="internship"
                    checked={selectedTrack === 'internship'}
                    onChange={() => handleTrackSelect('internship')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">6-Month Internship</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      Complete a 6-month internship with a company. You will need to submit company details and offer letter for verification.
                    </p>
                    <ul className="mt-3 text-sm text-gray-600 space-y-1">
                      <li>• Submit company details and offer letter</li>
                      <li>• Admin will verify and finalize your track</li>
                      <li>• Complete your 6-month internship</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Major Project 2 Option */}
              <div
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedTrack === 'major2'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleTrackSelect('major2')}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="track"
                    value="major2"
                    checked={selectedTrack === 'major2'}
                    onChange={() => handleTrackSelect('major2')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Major Project 2</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      Complete Major Project 2 as a solo project. You will also need to complete Internship 2 (2-month internship project).
                    </p>
                    <ul className="mt-3 text-sm text-gray-600 space-y-1">
                      <li>• Register Major Project 2 (solo project)</li>
                      <li>• Complete Internship 2 (solo project if needed)</li>
                      <li>• Submit faculty preferences for allocation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard/student')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedTrack || isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Choice'}
              </button>
            </div>
          </form>
        )}

        {/* Finalized Track Message */}
        {finalizedTrack && !canSubmit && (
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Track Finalized</h3>
            <p className="text-sm text-green-800">
              Your track has been finalized as: <span className="font-medium">{finalizedTrack === 'internship' ? '6-Month Internship' : 'Major Project 2'}</span>
            </p>
            <p className="text-sm text-green-700 mt-2">
              Please proceed with the next steps for your selected track.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sem8TrackSelection;

