import React from 'react';
import { format } from 'date-fns';

const ProgressTimeline = ({ steps, currentStep = 0, className = '' }) => {
  const getStepStatus = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepIcon = (index, status) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'current':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full">
            <span className="text-sm font-medium text-gray-600">{index + 1}</span>
          </div>
        );
    }
  };

  const getStepClasses = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'current':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`flow-root ${className}`}>
      <ul className="-mb-8">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;
          
          return (
            <li key={index}>
              <div className="relative pb-8">
                {!isLast && (
                  <span 
                    className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${
                      status === 'completed' ? 'bg-green-300' : 'bg-gray-300'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div className="flex-shrink-0">
                    {getStepIcon(index, status)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <p className={`text-sm font-medium ${getStepClasses(status)}`}>
                        {step.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {step.description}
                      </p>
                      {step.showWaitingMessage && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-800">
                                <strong>Project dashboard will be visible once a faculty has been allocated.</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {step.date && (
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(step.date), 'MMM dd, yyyy')}
                        </p>
                      )}
                      {step.status && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            step.status === 'completed' ? 'bg-green-100 text-green-800' :
                            step.status === 'current' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ProgressTimeline;
