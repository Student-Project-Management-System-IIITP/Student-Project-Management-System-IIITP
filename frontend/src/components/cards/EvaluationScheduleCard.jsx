import React from 'react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import StatusBadge from '../common/StatusBadge';

const EvaluationScheduleCard = ({ schedule }) => {
  if (!schedule) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Evaluation Schedule</h2>
        </div>
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Schedule Not Announced</h3>
          <p className="text-gray-600">Evaluation dates will be announced by the admin soon.</p>
        </div>
      </div>
    );
  }

  const getScheduleStatus = () => {
    if (!schedule.presentationDates || schedule.presentationDates.length === 0) {
      return { status: 'pending', text: 'Pending' };
    }

    const today = new Date();
    const presentationDate = new Date(schedule.presentationDates[0].date);
    
    if (isBefore(presentationDate, today)) {
      return { status: 'completed', text: 'Completed' };
    } else if (isAfter(presentationDate, addDays(today, 7))) {
      return { status: 'scheduled', text: 'Scheduled' };
    } else {
      return { status: 'upcoming', text: 'Upcoming' };
    }
  };

  const getNextPresentation = () => {
    if (!schedule.presentationDates || schedule.presentationDates.length === 0) {
      return null;
    }

    const today = new Date();
    const upcomingDates = schedule.presentationDates
      .filter(date => new Date(date.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return upcomingDates.length > 0 ? upcomingDates[0] : schedule.presentationDates[0];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'upcoming':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'scheduled':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const scheduleStatus = getScheduleStatus();
  const nextPresentation = getNextPresentation();
  const statusColor = getStatusColor(scheduleStatus.status);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Evaluation Schedule</h2>
          <StatusBadge status={scheduleStatus.status} text={scheduleStatus.text} />
        </div>
      </div>
      
      <div className="p-6">
        {nextPresentation ? (
          <div className="space-y-6">
            {/* Presentation Details */}
            <div className={`rounded-lg border p-4 ${statusColor}`}>
              <h3 className="font-medium text-gray-900 mb-3">Presentation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Date:</span>
                  <span className="ml-2">{format(new Date(nextPresentation.date), 'EEEE, MMMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="font-medium">Time:</span>
                  <span className="ml-2">{nextPresentation.time}</span>
                </div>
                <div>
                  <span className="font-medium">Venue:</span>
                  <span className="ml-2">{nextPresentation.venue}</span>
                </div>
                <div>
                  <span className="font-medium">Duration:</span>
                  <span className="ml-2">15 minutes presentation + 5 minutes Q&A</span>
                </div>
              </div>
            </div>

            {/* Evaluation Panel */}
            {nextPresentation.panelMembers && nextPresentation.panelMembers.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Evaluation Panel</h4>
                <div className="space-y-2">
                  {nextPresentation.panelMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.department || 'Faculty'}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        member.role === 'Chair' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {schedule.instructions && schedule.instructions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Important Instructions</h4>
                <ul className="space-y-2">
                  {schedule.instructions.map((instruction, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Status-specific messages */}
            {scheduleStatus.status === 'upcoming' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-orange-800">Presentation Soon</h3>
                    <p className="mt-1 text-sm text-orange-700">
                      Your presentation is scheduled within the next 7 days. Make sure you're prepared!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {scheduleStatus.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Presentation Completed</h3>
                    <p className="mt-1 text-sm text-green-700">
                      Your presentation has been completed. Results will be announced soon.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No presentation dates available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationScheduleCard;
