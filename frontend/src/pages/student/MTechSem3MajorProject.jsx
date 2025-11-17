import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import ProjectChatMini from '../../components/chat/ProjectChatMini';
import { useAuth } from '../../context/AuthContext';
import { useMTechSem3Track } from '../../hooks/useMTechSem3Track';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const MTechSem3MajorProject = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  const { trackChoice, loading: trackLoading } = useMTechSem3Track();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const degree = roleData?.degree || user?.degree;
  const currentSemester = roleData?.semester || user?.semester;
  const selectedTrack = trackChoice?.finalizedTrack || trackChoice?.chosenTrack || null;

  useEffect(() => {
    if (trackLoading) return;
    if (degree !== 'M.Tech' || currentSemester !== 3) {
      toast.error('This page is only available for M.Tech Semester 3 students');
      navigate('/dashboard/student');
      return;
    }
    if (selectedTrack !== 'coursework') {
      toast.error('Please choose the Major Project track first.');
      navigate('/student/mtech/sem3/track-selection');
    }
  }, [degree, currentSemester, selectedTrack, navigate, trackLoading]);

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        const response = await studentAPI.getProjects({ allSemesters: true });
        const projects = response?.data || [];
        const sem3Project = projects.find(
          (p) => p.semester === 3 && p.projectType === 'major1'
        );
        setProject(sem3Project || null);
      } catch (error) {
        console.error('Failed to load Sem 3 major project:', error);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, []);

  const renderProjectSummary = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span>Checking your registration...</span>
          </div>
        </div>
      );
    }

    if (!project) {
      return (
        <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
          <p className="text-gray-800 font-semibold">No Major Project 1 registered yet.</p>
          <p className="text-gray-500 text-sm mt-1">
            Use the button below to start your major project registration.
          </p>
          <button
            onClick={() => navigate('/student/mtech/sem3/major-project/register')}
            className="mt-4 inline-flex items-center px-6 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Register for Major Project 1
          </button>
        </div>
      );
    }

    if (!project.faculty) {
      return (
        <div className="border border-yellow-200 rounded-lg p-6 bg-yellow-50">
          <p className="text-xs uppercase tracking-wide text-yellow-600 font-semibold">
            Awaiting Allocation
          </p>
          <h3 className="text-xl font-semibold text-gray-900 mt-1">{project.title || 'Major Project 1'}</h3>
          <p className="text-gray-600">Your registration is complete. Faculty allocation is in progress.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div>
              <p className="text-xs uppercase text-gray-500">Domain</p>
              <p className="font-medium">{project.domain || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Submitted</p>
              <p className="font-medium">{new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Faculty Preferences</p>
              <p className="font-medium">{project.facultyPreferences?.length || 0} mentors selected</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-100 rounded-lg p-6 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">
                Faculty Allocated
              </p>
              <h3 className="text-xl font-semibold text-gray-900">
                {project.title || 'Major Project 1'}
              </h3>
              <p className="text-gray-600 text-sm mt-1">{project.domain || 'Domain not specified'}</p>
            </div>
            <StatusBadge status="success" text="Allocated" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p className="text-xs uppercase text-gray-500">Faculty Mentor</p>
              <p className="font-medium">{project.faculty?.fullName || '—'}</p>
              <p className="text-xs text-gray-500">{project.faculty?.department}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Contact</p>
              <p className="font-medium">{project.faculty?.collegeEmail || project.faculty?.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Status</p>
              <p className="font-medium capitalize">{project.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Start Date</p>
              <p className="font-medium">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Scheduled by mentor'}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-700">
            <p className="text-xs uppercase text-gray-500">Project Summary</p>
            <p className="mt-1">{project.description || 'No summary provided yet.'}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/projects/${project._id}`)}
              className="flex-1 px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              Open Workspace
            </button>
            <button
              onClick={() => navigate('/student/mtech/sem3/major-project/register')}
              className="flex-1 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
            >
              Update Details
            </button>
          </div>
        </div>

        <ProjectChatMini projectId={project._id} />
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <p className="text-sm uppercase tracking-wide text-indigo-600 font-semibold">
            M.Tech Semester 3
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            Major Project 1 Registration
          </h1>
          <p className="text-gray-600 mt-3">
            Review your assigned track information, then register your Major Project 1 proposal and team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase text-gray-500">Student</p>
            <p className="text-gray-900 font-semibold mt-1">{user?.name || 'Student'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase text-gray-500">Track</p>
            <p className="text-gray-900 font-semibold mt-1">Major Project 1</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase text-gray-500">Status</p>
            <StatusBadge
              status={project ? 'success' : 'warning'}
              text={project ? 'Registered' : 'Pending'}
            />
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 space-y-3 text-sm text-indigo-900">
          <p className="font-semibold text-indigo-950">Before you register:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Finalize your Major Project 1 topic and objectives.</li>
            <li>Confirm your team members (if applicable) and decide leadership.</li>
            <li>Prepare a summary / abstract to submit with your registration.</li>
            <li>Have at least three preferred faculty mentors ready for allocation.</li>
          </ul>
        </div>

        {renderProjectSummary()}
      </div>
    </Layout>
  );
};

export default MTechSem3MajorProject;

