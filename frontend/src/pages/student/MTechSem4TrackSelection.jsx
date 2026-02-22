import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useMTechSem4Track } from '../../hooks/useMTechSem4Track';
import { internshipAPI, studentAPI } from '../../utils/api';

const TRACK_OPTIONS = [
  {
    id: 'internship',
    title: '6-Month Internship 2',
    subtitle: 'Second 6-month industry internship',
    description:
      'Work with a company for your second 6-month internship. Submit offer letter and updates for verification.',
    bullets: [
      'Upload offer letter and project brief',
      'Regular progress reflections',
      'Final verification with internship committee',
    ],
  },
  {
    id: 'coursework',
    title: 'Major Project 2',
    subtitle: 'Institute-guided Major Project 2',
    description:
      'Continue with institute-guided Major Project 2 under an allocated faculty guide.',
    bullets: [
      'Define your Major Project 2 proposal',
      'Submit faculty preferences (when enabled)',
      'Work with an allocated supervisor until completion',
    ],
  },
];

const defaultInternshipValues = {
  companyName: '',
  location: '',
  startDate: '',
  endDate: '',
  mode: 'onsite',
  hasStipend: 'no',
  stipendRs: '',
  roleOrNatureOfWork: '',
  mentorName: '',
  mentorEmail: '',
  mentorPhone: '',
  offerLetterLink: ''
};

const MTechSem4TrackSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roleData } = useAuth();
  const { trackChoice, loading, setChoice } = useMTechSem4Track();
  const [selectedTrack, setSelectedTrack] = useState(location.state?.preselect || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [internshipApp, setInternshipApp] = useState(null);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [showInternshipForm, setShowInternshipForm] = useState(false);
  const [major2Option, setMajor2Option] = useState(null); // 'continue' or 'new'
  const [sem3Project, setSem3Project] = useState(null);

  const currentSemester = roleData?.semester || user?.semester;
  const degree = roleData?.degree || user?.degree;

  const {
    register,
    handleSubmit: handleInternshipSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: defaultInternshipValues
  });

  const hasStipend = watch('hasStipend');

  useEffect(() => {
    if (degree !== 'M.Tech' || currentSemester !== 4) {
      toast.error('This flow is only available for M.Tech Semester 4 students');
      navigate('/dashboard/student');
    }
  }, [currentSemester, degree, navigate]);

  useEffect(() => {
    if (trackChoice?.finalizedTrack) {
      setSelectedTrack(trackChoice.finalizedTrack);
    } else if (trackChoice?.chosenTrack) {
      setSelectedTrack(trackChoice.chosenTrack);
    }

    if (
      trackChoice &&
      (trackChoice.finalizedTrack === 'internship' || trackChoice.chosenTrack === 'internship')
    ) {
      setShowInternshipForm(true);
    } else {
      setShowInternshipForm(false);
    }
  }, [trackChoice]);

  useEffect(() => {
    const loadSem3Project = async () => {
      if (degree !== 'M.Tech') return;
      try {
        const response = await studentAPI.getProjects({ allSemesters: true });
        const projects = response?.data || [];
        const sem3Major1 = projects.find(
          (p) => p.semester === 3 && p.projectType === 'major1'
        );
        setSem3Project(sem3Major1 || null);
      } catch (error) {
        setSem3Project(null);
      }
    };

    loadSem3Project();
  }, [degree]);

  const currentStatus = useMemo(() => {
    if (!trackChoice) return null;
    const trackLabel =
      trackChoice.finalizedTrack === 'internship' || trackChoice.chosenTrack === 'internship'
        ? '6-Month Internship 2'
        : 'Major Project 2';
    return {
      trackLabel,
      finalized: !!trackChoice.finalizedTrack,
    };
  }, [trackChoice]);

  const loadSem4Application = useCallback(async () => {
    if (degree !== 'M.Tech' || currentSemester !== 4) return;
    try {
      setApplicationLoading(true);
      const response = await internshipAPI.getMyApplications();
      const apps = response?.data || [];
      const sem4SixMonthApp = apps.find((app) => app.semester === 4 && app.type === '6month');

      if (sem4SixMonthApp) {
        const details = sem4SixMonthApp.details || {};
        setInternshipApp(sem4SixMonthApp);
        reset({
          companyName: details.companyName || '',
          location: details.location || '',
          startDate: details.startDate ? new Date(details.startDate).toISOString().split('T')[0] : '',
          endDate: details.endDate ? new Date(details.endDate).toISOString().split('T')[0] : '',
          mode: details.mode || 'onsite',
          hasStipend: details.hasStipend || (details.stipendRs > 0 ? 'yes' : 'no'),
          stipendRs: details.stipendRs || '',
          roleOrNatureOfWork: details.roleOrNatureOfWork || '',
          mentorName: details.mentorName || '',
          mentorEmail: details.mentorEmail || '',
          mentorPhone: details.mentorPhone || '',
          offerLetterLink: details.offerLetterLink || ''
        });
      } else {
        setInternshipApp(null);
        reset(defaultInternshipValues);
      }
    } catch (error) {
      console.error('Failed to load Sem 4 internship application:', error);
      toast.error('Unable to load internship application data');
    } finally {
      setApplicationLoading(false);
    }
  }, [currentSemester, degree, reset]);

  useEffect(() => {
    if (showInternshipForm) {
      loadSem4Application();
    }
  }, [showInternshipForm, loadSem4Application]);

  const handleSubmitChoice = async (e) => {
    e.preventDefault();
    if (!selectedTrack) {
      toast.error('Please choose an option to continue');
      return;
    }

    if (selectedTrack === 'coursework' && !major2Option) {
      toast.error('Please choose how you want to proceed with Major Project 2');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = selectedTrack === 'internship' ? 'internship' : 'coursework';
      await setChoice(payload);
      if (selectedTrack === 'internship') {
        toast.success('Track selected. Please submit your Internship 2 application below.');
        setShowInternshipForm(true);
        await loadSem4Application();
      } else {
        if (major2Option === 'continue') {
          toast.success('Track selected. You chose to continue your previous Major Project 1 with the same faculty.');
        } else if (major2Option === 'new') {
          toast.success('Track selected. You chose to start a new Major Project 2 under the same faculty from last semester.');
        } else {
          toast.success('Track selected. Continue with Major Project 2 planning from your dashboard.');
        }
        navigate('/dashboard/student');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save your choice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEditInternship =
    !internshipApp || ['submitted', 'needs_info'].includes(internshipApp.status);

  const onSubmitInternship = async (data) => {
    if (!canEditInternship) {
      toast.error('This application can no longer be edited.');
      return;
    }
    const details = {
      companyName: data.companyName,
      location: data.location,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      mode: data.mode,
      hasStipend: data.hasStipend,
      stipendRs: data.hasStipend === 'yes' ? Number(data.stipendRs || 0) : 0,
      roleOrNatureOfWork: data.roleOrNatureOfWork,
      mentorName: data.mentorName,
      mentorEmail: data.mentorEmail,
      mentorPhone: data.mentorPhone,
      offerLetterLink: data.offerLetterLink
    };

    if (!details.offerLetterLink) {
      toast.error('Offer letter link is required');
      return;
    }

    try {
      setIsSubmittingApplication(true);
      if (internshipApp?._id) {
        await internshipAPI.updateApplication(internshipApp._id, details, null);
        toast.success('Internship application updated');
      } else {
        await internshipAPI.createApplication('6month', details, null);
        toast.success('Internship application submitted');
      }
      await loadSem4Application();
      navigate('/dashboard/student');
    } catch (error) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Preparing your Semester 4 flow...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!showInternshipForm && (
          <>
            <div className="mb-8">
              <p className="text-sm uppercase tracking-wide text-indigo-600 font-semibold">
                M.Tech Semester 4
              </p>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Choose Your Path</h1>
              <p className="text-gray-600 mt-3 max-w-2xl">
                Welcome back, {user?.name || 'M.Tech scholar'}! Start Semester 4 by selecting how you want
                to progresseither continue with a 6-month internship or dive into Major Project 2 with an
                institute guide.
              </p>
            </div>

            {currentStatus && (
              <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Current Selection</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentStatus.trackLabel}
                    {currentStatus.finalized ? ' (finalized)' : ' (pending)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTrack(null)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Change selection
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitChoice} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {TRACK_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedTrack(option.id)}
                    className={`text-left p-6 rounded-2xl border-2 transition-all ${
                      selectedTrack === option.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-inner'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <span
                        className={`mt-0.5 h-4 w-4 rounded-full border-2 ${
                          selectedTrack === option.id
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-gray-300 bg-white'
                        }`}
                      ></span>
                      <div className="ml-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">{option.subtitle}</p>
                        <h3 className="text-xl font-semibold text-gray-900 mt-1">{option.title}</h3>
                        <p className="text-sm text-gray-600 mt-2">{option.description}</p>
                        <ul className="mt-4 text-sm text-gray-600 space-y-1">
                          {option.bullets.map((bullet) => (
                            <li key={bullet}>• {bullet}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedTrack === 'coursework' && (
                <div className="mt-4 border border-indigo-200 rounded-xl p-4 bg-indigo-50">
                  <h3 className="text-sm font-semibold text-gray-900">Major Project 2 preference</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose whether you want to continue your previous Major Project 1 or start a new project under the same faculty in Semester 4.
                  </p>
                  {sem3Project && (
                    <div className="mt-3 text-xs text-gray-700 bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-semibold text-gray-900">Your M.Tech Sem 3 Major Project 1</p>
                      <p className="mt-1">
                        <span className="font-medium">Title:</span> {sem3Project.title || 'Not available'}
                      </p>
                      <p className="mt-1">
                        <span className="font-medium">Faculty:</span> {sem3Project.faculty?.fullName || 'Not allocated yet'}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMajor2Option('continue')}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm ${
                        major2Option === 'continue'
                          ? 'border-indigo-600 bg-white shadow-sm'
                          : 'border-gray-300 bg-white hover:border-indigo-400'
                      }`}
                    >
                      <span className="block font-semibold text-gray-900">Continue Major Project 1</span>
                      <span className="block text-gray-600 mt-1 text-xs">
                        Carry forward your existing project work into Major Project 2 with the same faculty mentor.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMajor2Option('new')}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm ${
                        major2Option === 'new'
                          ? 'border-indigo-600 bg-white shadow-sm'
                          : 'border-gray-300 bg-white hover:border-indigo-400'
                      }`}
                    >
                      <span className="block font-semibold text-gray-900">Start New Project</span>
                      <span className="block text-gray-600 mt-1 text-xs">
                        Begin a fresh Major Project 2 topic while staying under the same faculty mentor from last semester.
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => navigate('/dashboard/student')}
                >
                  Not now
                </button>
                <button
                  type="submit"
                  disabled={!selectedTrack || isSubmitting || (selectedTrack === 'coursework' && !major2Option)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </form>
          </>
        )}

        {showInternshipForm && (
          <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-indigo-600 font-semibold">
                  Internship 2 Details
                </p>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">6-Month Internship 2 Application</h2>
                <p className="text-gray-600 mt-2">
                  Provide company, mentor, and document details similar to your Internship 1 workflow.
                </p>
              </div>
              {internshipApp && (
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Application Status</p>
                  <StatusBadge
                    status={
                      internshipApp.status === 'verified_pass'
                        ? 'success'
                        : internshipApp.status === 'verified_fail'
                          ? 'error'
                          : internshipApp.status === 'needs_info'
                            ? 'error'
                            : 'warning'
                    }
                    text={(internshipApp.status || 'pending').replace('_', ' ')}
                  />
                </div>
              )}
            </div>

            {applicationLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : !canEditInternship && internshipApp ? (
              <div className="mt-6 border border-green-200 bg-green-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800">
                  Your internship application has been finalized and can no longer be edited.
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Any status changes made by admin (pass / fail / needs info) will be visible on your dashboard.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInternshipSubmit(onSubmitInternship)} className="space-y-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('companyName', { required: 'Company name is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {errors.companyName && (
                        <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        {...register('location')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        {...register('startDate', { required: 'Start date is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {errors.startDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        {...register('endDate', { required: 'End date is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {errors.endDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('mode', { required: 'Mode is required' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="onsite">Onsite</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Are you getting a stipend? <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('hasStipend', { required: 'Please select an option' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                      {errors.hasStipend && (
                        <p className="mt-1 text-sm text-red-600">{errors.hasStipend.message}</p>
                      )}
                    </div>

                    {hasStipend === 'yes' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monthly Stipend (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          {...register('stipendRs', {
                            required: 'Stipend amount is required when stipend is selected',
                            min: { value: 0, message: 'Amount must be positive' }
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {errors.stipendRs && (
                          <p className="mt-1 text-sm text-red-600">{errors.stipendRs.message}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nature of Work / Role <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('roleOrNatureOfWork', { required: 'This field is required' })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Describe responsibilities, tech stack, and expected outcomes"
                    />
                    {errors.roleOrNatureOfWork && (
                      <p className="mt-1 text-sm text-red-600">{errors.roleOrNatureOfWork.message}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Manager / Mentor Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manager Name</label>
                      <input
                        type="text"
                        {...register('mentorName')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manager Email</label>
                      <input
                        type="email"
                        {...register('mentorEmail')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manager Phone</label>
                      <input
                        type="tel"
                        {...register('mentorPhone')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Required Documents</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Offer Letter Link (Google Drive) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      {...register('offerLetterLink', { required: 'Offer letter link is required' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="https://drive.google.com/..."
                    />
                    {errors.offerLetterLink && (
                      <p className="mt-1 text-sm text-red-600">{errors.offerLetterLink.message}</p>
                    )}
                  </div>
                </div>

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
                    disabled={isSubmittingApplication}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSubmittingApplication
                      ? 'Submitting...'
                      : internshipApp
                        ? 'Update Application'
                        : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MTechSem4TrackSelection;
