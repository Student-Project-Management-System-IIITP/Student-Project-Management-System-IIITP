import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSem7Project } from '../../hooks/useSem7Project';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { 
  FiTarget, FiFileText, FiInfo, FiCheckCircle, FiAlertCircle, 
  FiClock, FiUsers, FiBriefcase, FiX, FiLoader, FiArrowRight,
  FiAlertTriangle, FiBook, FiCalendar, FiUserCheck
} from 'react-icons/fi';

const Sem7TrackSelection = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  const { 
    trackChoice, 
    finalizedTrack, 
    trackChoiceStatus,
    canChooseTrack,
    setSem7Choice,
    loading 
  } = useSem7Project();

  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [windowStatus, setWindowStatus] = useState(null);
  const [minGroupMembers, setMinGroupMembers] = useState(4); // Default fallback
  const [maxGroupMembers, setMaxGroupMembers] = useState(5); // Default fallback

  // Check if student is in Sem 7
  useEffect(() => {
    const currentSemester = roleData?.semester || user?.semester;
    if (currentSemester !== 7) {
      toast.error('Semester 7 track selection is only available for Semester 7 students');
      navigate('/dashboard/student');
    }
  }, [roleData, user, navigate]);

  // Load window status and group config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { getToken } = await import('../../utils/tokenStorage');
        const token = getToken();
        // Load window status
        const windowResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/student/system-config/sem7.choiceWindow`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (windowResponse.ok) {
          const windowData = await windowResponse.json();
          if (windowData.success && windowData.data) {
            setWindowStatus(windowData.data);
          }
        }

        // Load group size config for Sem 7 Major Project 1
        const [minResponse, maxResponse] = await Promise.allSettled([
          studentAPI.getSystemConfig('sem7.major1.minGroupMembers').catch(() => ({ success: false })),
          studentAPI.getSystemConfig('sem7.major1.maxGroupMembers').catch(() => ({ success: false }))
        ]);

        if (minResponse.status === 'fulfilled' && minResponse.value?.success && minResponse.value?.data?.value) {
          setMinGroupMembers(parseInt(minResponse.value.data.value));
        }

        if (maxResponse.status === 'fulfilled' && maxResponse.value?.success && maxResponse.value?.data?.value) {
          setMaxGroupMembers(parseInt(maxResponse.value.data.value));
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    loadConfig();
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
      await setSem7Choice(selectedTrack);
      if (selectedTrack === 'internship') {
        toast.success('Track selected. Please submit your 6-month internship application.');
        navigate('/student/sem7/internship/apply/6month');
      } else {
        toast.success('Track selected. Proceed with coursework steps.');
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
      <div className="min-h-[calc(100vh-64px)] bg-surface-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
                <FiTarget className="w-5 h-5 text-primary-600" />
                Semester 7 Track Selection
              </h1>
              <p className="text-sm text-neutral-600 mt-1">
                Choose your track for Semester 7
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/student')}
              className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label="Close"
            >
              <FiX className="w-5 h-5 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* Main Content - 2 Column Layout */}
        <div className="flex-1 min-h-0 w-full">
          <div className="lg:grid lg:grid-cols-12 gap-3 lg:gap-4 flex-1 min-h-0 px-3 py-3">
            {/* Left Column - Track Selection */}
            <div className="lg:col-span-8 flex flex-col h-full min-h-0 space-y-3 overflow-y-auto custom-scrollbar pr-1">
              {/* Current Status Banner */}
              {trackChoice && (
                <div className="bg-info-50 rounded-xl p-4 border border-info-200 flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FiInfo className="w-4 h-4 text-info-600" />
                        <h3 className="text-sm font-semibold text-info-900">Current Status</h3>
                      </div>
                      <p className="text-xs text-info-800 mb-1">
                        Selected Track: <span className="font-medium">{trackChoice.chosenTrack === 'internship' ? '6-Month Internship' : 'Coursework'}</span>
                      </p>
                      {trackChoice.finalizedTrack && (
                        <p className="text-xs text-info-800">
                          Finalized Track: <span className="font-medium">{trackChoice.finalizedTrack === 'internship' ? '6-Month Internship' : 'Coursework'}</span>
                        </p>
                      )}
                      {trackChoice.adminRemarks && (
                        <div className="mt-2 p-2 bg-white/60 rounded border border-info-300">
                          <p className="text-xs font-medium text-info-900 mb-0.5">Admin Remarks:</p>
                          <p className="text-xs text-info-800">{trackChoice.adminRemarks}</p>
                        </div>
                      )}
                    </div>
                    {getStatusBadge()}
                  </div>
                </div>
              )}

              {/* Window Status Warning */}
              {!windowOpen && (
                <div className="bg-warning-50 rounded-xl p-4 border border-warning-200 flex-shrink-0">
                  <div className="flex items-start gap-2">
                    <FiAlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-warning-900 mb-1">Selection Window Closed</p>
                      <p className="text-xs text-warning-800">
                        The track selection window is currently closed. Please contact admin for more information.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Finalized Track Message */}
              {finalizedTrack && !canSubmit && (
                <div className="bg-success-50 rounded-xl p-4 border border-success-200 flex-shrink-0">
                  <div className="flex items-start gap-2">
                    <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-success-900 mb-1">Track Finalized</p>
                      <p className="text-xs text-success-800">
                        Your track has been finalized as: <span className="font-medium">{finalizedTrack === 'internship' ? '6-Month Internship' : 'Coursework'}</span>
                      </p>
                      <p className="text-xs text-success-700 mt-1">
                        Please proceed with the next steps for your selected track.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Track Selection Form */}
              {canSubmit && (
                <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                  <div className="space-y-4 flex-1 min-h-0">
                    {/* Coursework Track Card */}
                    <div
                      className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all flex-shrink-0 ${
                        selectedTrack === 'coursework'
                          ? 'border-primary-500 bg-primary-50 shadow-md'
                          : 'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm'
                      }`}
                      onClick={() => handleTrackSelect('coursework')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedTrack === 'coursework'
                              ? 'border-primary-600 bg-primary-600'
                              : 'border-neutral-300'
                          }`}>
                            {selectedTrack === 'coursework' && (
                              <FiCheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                              <FiFileText className="w-5 h-5 text-primary-600" />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900">Coursework Track</h3>
                          </div>
                          <p className="text-sm text-neutral-700 mb-4 leading-relaxed">
                            Complete two components simultaneously: Major Project 1 (group) and Internship 1
                          </p>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="flex items-start gap-2">
                              <FiUsers className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-neutral-800 mb-1">Major Project 1</p>
                                <p className="text-xs text-neutral-600 leading-relaxed">Group project ({minGroupMembers}-{maxGroupMembers} members) with faculty guide</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <FiBriefcase className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-neutral-800 mb-1">Internship 1</p>
                                <p className="text-xs text-neutral-600 leading-relaxed">Summer internship OR solo project (admin assigns)</p>
                              </div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-neutral-200">
                            <p className="text-xs text-neutral-600 italic">
                              Best for: Students who want structured on-campus work with faculty guidance
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 6-Month Internship Track Card */}
                    <div
                      className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all flex-shrink-0 ${
                        selectedTrack === 'internship'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-neutral-200 bg-white hover:border-purple-300 hover:shadow-sm'
                      }`}
                      onClick={() => handleTrackSelect('internship')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedTrack === 'internship'
                              ? 'border-purple-600 bg-purple-600'
                              : 'border-neutral-300'
                          }`}>
                            {selectedTrack === 'internship' && (
                              <FiCheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <FiTarget className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900">6-Month Internship Track</h3>
                          </div>
                          <p className="text-sm text-neutral-700 mb-4 leading-relaxed">
                            Focus on industry internship with company verification
                          </p>
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="flex items-start gap-2">
                              <FiBriefcase className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-neutral-800 mb-1">Submit Application</p>
                                <p className="text-xs text-neutral-600 leading-relaxed">Company details, offer letter, and duration</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <FiUserCheck className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-neutral-800 mb-1">Admin Verification</p>
                                <p className="text-xs text-neutral-600 leading-relaxed">Admin reviews and verifies internship completion</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <FiCalendar className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-neutral-800 mb-1">Semester 8</p>
                                <p className="text-xs text-neutral-600 leading-relaxed">Coursework required</p>
                              </div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-neutral-200">
                            <p className="text-xs text-neutral-600 italic">
                              Best for: Students with confirmed 6-month industry internship offers
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 mt-4 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/student')}
                      className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedTrack || isSubmitting}
                      className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <FiLoader className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Choice
                          <FiArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right Column - Information */}
            <div className="lg:col-span-4 flex flex-col h-full min-h-0 space-y-3 mt-4 lg:mt-0 overflow-y-auto custom-scrollbar pl-1">
              {/* Selection Process */}
              <div className="bg-info-50 rounded-xl p-4 border border-info-200 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <FiInfo className="w-4 h-4 text-info-600" />
                  <h3 className="text-sm font-semibold text-neutral-800">Selection Process</h3>
                </div>
                <div className="space-y-2 text-xs text-info-800">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-info-900">1.</span>
                    <span>Select your preferred track</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-info-900">2.</span>
                    <span>Admin reviews and approves your choice</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-info-900">3.</span>
                    <span>Proceed with track-specific requirements</span>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-warning-50 rounded-xl p-4 border border-warning-200 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <FiAlertCircle className="w-4 h-4 text-warning-600" />
                  <h3 className="text-sm font-semibold text-neutral-800">Important Notes</h3>
                </div>
                <div className="space-y-2 text-xs text-warning-800">
                  <p>• Track selection requires admin approval</p>
                  <p>• You can update your choice if needed</p>
                  <p>• Once finalized, track cannot be changed</p>
                  <p>• Contact admin for any questions</p>
                </div>
              </div>

              {/* Track Comparison */}
              <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <FiBook className="w-4 h-4 text-neutral-600" />
                  <h3 className="text-sm font-semibold text-neutral-800">Quick Comparison</h3>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-semibold text-neutral-800 mb-1">Coursework Track</p>
                    <p className="text-neutral-600 text-[11px]">On-campus work with faculty guidance, group projects, structured timeline</p>
                  </div>
                  <div className="pt-2 border-t border-neutral-200">
                    <p className="font-semibold text-neutral-800 mb-1">Internship Track</p>
                    <p className="text-neutral-600 text-[11px]">Industry experience, company verification, flexible schedule</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Sem7TrackSelection;

