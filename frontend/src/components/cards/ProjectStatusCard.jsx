import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import ProgressTimeline from '../common/ProgressTimeline';

const ProjectStatusCard = ({ project, onUpdate }) => {
  if (!project) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Project Status</h2>
        </div>
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Registered</h3>
          <p className="text-gray-600 mb-4">You haven't registered for Minor Project 1 yet.</p>
          <Link
            to="/student/projects/register"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Register Project
          </Link>
        </div>
      </div>
    );
  }

  const getProjectTimeline = () => {
    const steps = [
      {
        title: 'Project Registration',
        description: 'Project registered successfully',
        status: 'completed',
        date: project.createdAt,
      },
    ];

    if (project.status === 'active') {
      steps.push({
        title: 'Project Active',
        description: 'Start working on your project',
        status: 'current',
        date: project.startDate || project.createdAt,
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

  const getActionButtons = () => {
    const buttons = [];

    if (project.status === 'registered') {
      buttons.push(
        <Link
          key="view"
          to={`/student/projects/${project._id}`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          View Project
        </Link>
      );
    }

    if (project.status === 'active') {
      buttons.push(
        <Link
          key="upload"
          to={`/student/projects/${project._id}/upload`}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
        >
          Upload PPT
        </Link>
      );
    }

    return buttons;
  };

  const getStatusInfo = () => {
    switch (project.status) {
      case 'registered':
        return {
          message: 'Your project has been registered and is awaiting approval.',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      case 'active':
        return {
          message: 'Your project is active. You can now start working on it.',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'completed':
        return {
          message: 'Congratulations! Your project has been completed and evaluated.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
      default:
        return {
          message: 'Project status is being processed.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const actionButtons = getActionButtons();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Project Status</h2>
          <StatusBadge status={project.status} />
        </div>
      </div>
      
      <div className="p-6">
        {/* Project Info */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-2">{project.title}</h3>
          <p className="text-sm text-gray-600 mb-4">{project.description}</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Project Type:</span>
              <span className="ml-2">Minor Project 1</span>
            </div>
            <div>
              <span className="font-medium">Semester:</span>
              <span className="ml-2">4th Semester</span>
            </div>
            <div>
              <span className="font-medium">Academic Year:</span>
              <span className="ml-2">{project.academicYear}</span>
            </div>
            <div>
              <span className="font-medium">Registered:</span>
              <span className="ml-2">{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className={`rounded-lg border p-4 mb-6 ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
          <p className={`text-sm ${statusInfo.color}`}>{statusInfo.message}</p>
        </div>

        {/* Action Buttons */}
        {actionButtons.length > 0 && (
          <div className="flex space-x-3 mb-6">
            {actionButtons}
          </div>
        )}

        {/* Progress Timeline */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Project Timeline</h4>
          <ProgressTimeline steps={getProjectTimeline()} />
        </div>

        {/* Additional Info */}
        {project.additionalNotes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Notes</h4>
            <p className="text-sm text-gray-600">{project.additionalNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectStatusCard;
