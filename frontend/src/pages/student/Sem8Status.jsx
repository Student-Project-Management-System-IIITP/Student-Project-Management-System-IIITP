import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSem8Project } from '../../hooks/useSem8Project';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';

const Sem8Status = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  const { 
    sem8Status,
    trackChoice,
    studentType,
    isType1,
    isType2,
    loading 
  } = useSem8Project();

  // Check if student is in Sem 8
  useEffect(() => {
    const currentSemester = roleData?.semester || user?.semester;
    if (currentSemester !== 8) {
      toast.error('Semester 8 status is only available for Semester 8 students');
      navigate('/dashboard/student');
    }
  }, [roleData, user, navigate]);

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

  if (!sem8Status) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">Unable to load Sem 8 status. Please try again later.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Semester 8 Status</h1>
          <p className="text-gray-600">
            View your current semester 8 status and track information
          </p>
        </div>

        {/* Student Type Information */}
        <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Student Type</h2>
          {isType1 && (
            <div>
              <StatusBadge status="info" text="Type 1: Completed 6-Month Internship in Sem 7" />
              <p className="mt-3 text-sm text-gray-700">
                You have completed a 6-month internship in Semester 7. You are automatically enrolled in coursework for Semester 8.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                <strong>Required:</strong> Major Project 2 (group-based) + Internship 2
              </p>
            </div>
          )}
          {isType2 && (
            <div>
              <StatusBadge status="info" text="Type 2: Completed Coursework in Sem 7" />
              <p className="mt-3 text-sm text-gray-700">
                You completed coursework in Semester 7. You can choose between 6-month internship or Major Project 2 for Semester 8.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                <strong>Options:</strong> 6-Month Internship OR Major Project 2 (solo) + Internship 2
              </p>
            </div>
          )}
          {!isType1 && !isType2 && (
            <div>
              <StatusBadge status="warning" text="Unable to determine student type" />
              <p className="mt-3 text-sm text-gray-700">
                Please ensure your Semester 7 track selection is properly recorded.
              </p>
            </div>
          )}
        </div>

        {/* Track Selection Status */}
        {trackChoice && (
          <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Track Selection</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Selected Track:</span>
                <span className="text-sm text-gray-900">
                  {trackChoice.chosenTrack === 'internship' ? '6-Month Internship' : 
                   trackChoice.chosenTrack === 'major2' ? 'Major Project 2' : 
                   trackChoice.chosenTrack || 'Not selected'}
                </span>
              </div>
              
              {trackChoice.finalizedTrack && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Finalized Track:</span>
                  <span className="text-sm text-gray-900 font-semibold">
                    {trackChoice.finalizedTrack === 'internship' ? '6-Month Internship' : 
                     trackChoice.finalizedTrack === 'major2' ? 'Major Project 2' : 
                     trackChoice.finalizedTrack}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Verification Status:</span>
                <StatusBadge 
                  status={
                    trackChoice.verificationStatus === 'approved' ? 'success' :
                    trackChoice.verificationStatus === 'rejected' ? 'error' :
                    trackChoice.verificationStatus === 'needs_info' ? 'error' :
                    'warning'
                  }
                  text={
                    trackChoice.verificationStatus === 'approved' ? 'Approved' :
                    trackChoice.verificationStatus === 'rejected' ? 'Rejected' :
                    trackChoice.verificationStatus === 'needs_info' ? 'Needs Information' :
                    'Pending'
                  }
                />
              </div>
              
              {trackChoice.adminRemarks && (
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">Admin Remarks:</p>
                  <p className="text-sm text-gray-600">{trackChoice.adminRemarks}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Type 1 Auto-Enrollment Notice */}
        {isType1 && trackChoice && trackChoice.finalizedTrack === 'major2' && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Auto-Enrolled in Coursework</h3>
            <p className="text-sm text-green-800">
              You have been automatically enrolled in the coursework track (Major Project 2). 
              Please proceed with group formation and project registration.
            </p>
          </div>
        )}

        {/* Type 2 Track Selection Reminder */}
        {isType2 && !trackChoice && (
          <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">Track Selection Required</h3>
            <p className="text-sm text-yellow-800 mb-3">
              Please select your track choice to proceed with Semester 8.
            </p>
            <button
              onClick={() => navigate('/student/sem8/track-selection')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Go to Track Selection
            </button>
          </div>
        )}

        {/* Next Steps */}
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h2>
          {isType1 && (
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Create or join a group for Major Project 2</li>
              <li>Finalize your group</li>
              <li>Register Major Project 2 with faculty preferences</li>
              <li>Complete Internship 2 (if required)</li>
            </ol>
          )}
          {isType2 && trackChoice?.chosenTrack === 'internship' && (
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Submit your 6-month internship application</li>
              <li>Wait for admin verification</li>
              <li>Complete your 6-month internship</li>
            </ol>
          )}
          {isType2 && trackChoice?.chosenTrack === 'major2' && (
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Register Major Project 2 (solo project)</li>
              <li>Submit faculty preferences</li>
              <li>Complete Internship 2 (if required)</li>
            </ol>
          )}
          {isType2 && !trackChoice && (
            <p className="text-sm text-gray-700">
              Please select your track choice first to see the next steps.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Sem8Status;

