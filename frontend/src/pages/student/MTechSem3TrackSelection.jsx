import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useMTechSem3Track } from '../../hooks/useMTechSem3Track';
import { internshipAPI } from '../../utils/api';

const TRACK_OPTIONS = [
  {
    id: 'internship',
    title: '6-Month Internship',
    subtitle: 'Industry experience with Internship 1',
    description:
      'Work with a company for Internship 1. Submit offer letter and weekly updates for verification.',
    bullets: [
      'Upload offer letter and project brief',
      'Weekly progress reflections',
      'Final verification with internship committee',
    ],
  },
  {
    id: 'coursework',
    title: 'Major Project 1',
    subtitle: 'Institute-guided Major Project 1',
    description:
      'Form your Major Project 1 team, define your proposal, and work with an allocated faculty guide.',
    bullets: [
      'Create or join a Major Project 1 group',
      'Submit proposal and faculty preferences',
      'Complete Internship 1 under institute supervision',
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

const MTechSem3TrackSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roleData } = useAuth();
  const { trackChoice, loading, setChoice } = useMTechSem3Track();
  const [selectedTrack, setSelectedTrack] = useState(location.state?.preselect || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [internshipApp, setInternshipApp] = useState(null);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [showInternshipForm, setShowInternshipForm] = useState(false);

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
    if (degree !== 'M.Tech' || currentSemester !== 3) {
      toast.error('This flow is only available for M.Tech Semester 3 students');
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

  const currentStatus = useMemo(() => {
    if (!trackChoice) return null;
    const trackLabel =
      trackChoice.finalizedTrack === 'internship' || trackChoice.chosenTrack === 'internship'
        ? '6-Month Internship'
        : 'Major Project 1';
    return {
      trackLabel,
      finalized: !!trackChoice.finalizedTrack,
    };
  }, [trackChoice]);

  const loadSem3Application = useCallback(async () => {
    if (degree !== 'M.Tech' || currentSemester !== 3) return;
    try {
      setApplicationLoading(true);
      const response = await internshipAPI.getMyApplications();
      const apps = response?.data || [];
      const sem3SixMonthApp = apps.find((app) => app.semester === 3 && app.type === '6month');

      if (sem3SixMonthApp) {
        const details = sem3SixMonthApp.details || {};
        setInternshipApp(sem3SixMonthApp);
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
      console.error('Failed to load Sem 3 internship application:', error);
      toast.error('Unable to load internship application data');
    } finally {
      setApplicationLoading(false);
    }
  }, [currentSemester, degree, reset]);

  useEffect(() => {
    if (showInternshipForm) {
      loadSem3Application();
    }
  }, [showInternshipForm, loadSem3Application]);

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrack) {
      toast.error('Please choose an option to continue');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = selectedTrack === 'internship' ? 'internship' : 'coursework';
      await setChoice(payload);
      if (selectedTrack === 'internship') {
        toast.success('Track selected. Please submit your Internship 1 application below.');
        setShowInternshipForm(true);
        await loadSem3Application();
      } else {
        toast.success('Great! Continue with Major Project 1 planning.');
        navigate('/student/mtech/sem3/major-project');
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
      await loadSem3Application();
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
            <p className="mt-4 text-gray-600">Preparing your Semester 3 flow...</p>
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
                M.Tech Semester 3
              </p>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Choose Your Path</h1>
              <p className="text-gray-600 mt-3 max-w-2xl">
                Welcome back, {user?.name || 'M.Tech scholar'}! Start Semester 3 by selecting how you want
                to progress—either continue with Internship 1 or dive into Major Project 1 with an
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

            <form onSubmit={handleTrackSubmit} className="space-y-6">
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
                  disabled={!selectedTrack || isSubmitting}
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
                  Internship 1 Details
                </p>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">6-Month Internship Application</h2>
                <p className="text-gray-600 mt-2">
                  Provide company, mentor, and document details just like the B.Tech Sem 7 workflow.
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

export default MTechSem3TrackSelection;

