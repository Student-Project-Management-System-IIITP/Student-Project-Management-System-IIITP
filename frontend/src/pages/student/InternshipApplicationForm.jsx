import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useSem8 } from '../../context/Sem8Context';
import { internshipAPI, studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import {
  FiX, FiBriefcase, FiUser, FiFileText, FiLink, FiTarget,
  FiInfo, FiZap, FiAlertTriangle, FiAlertCircle, FiCheckCircle,
  FiCalendar, FiMapPin, FiDollarSign, FiMail, FiPhone, FiLoader
} from 'react-icons/fi';

const InternshipApplicationForm = () => {
  const navigate = useNavigate();
  const { type, id } = useParams(); // type: '6month' or 'summer', id: application ID for editing
  const { user, roleData } = useAuth();
  const currentSemester = roleData?.semester || user?.semester;
  const isSem8 = currentSemester === 8;
  
  // Use appropriate context based on semester
  const sem7Context = useSem7Project();
  const sem8Context = useSem8();
  
  // Use Sem8 context for Sem 8 students, Sem7 context for Sem 7 students
  const internshipApplications = isSem8 ? (sem8Context?.internshipApplications || []) : sem7Context.internshipApplications;
  const createInternshipApplication = isSem8 ? sem8Context?.createInternshipApplication : sem7Context.createInternshipApplication;
  const updateInternshipApplication = isSem8 ? sem8Context?.updateInternshipApplication : sem7Context.updateInternshipApplication;
  const loading = isSem8 ? (sem8Context?.loading || false) : sem7Context.loading;

  const [isEditing, setIsEditing] = useState(!!id);
  const [application, setApplication] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [windowStatus, setWindowStatus] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      companyName: '',
      location: '',
      startDate: '',
      endDate: '',
      mentorName: '',
      mentorEmail: '',
      mentorPhone: '',
      roleOrNatureOfWork: '',
      mode: 'onsite',
      hasStipend: 'no',
      stipendRs: 0,
      offerLetterLink: '',
      completionCertificateLink: ''
    }
  });

  // Validate application type
  useEffect(() => {
    if (type && !['6month', 'summer'].includes(type)) {
      toast.error('Invalid application type');
      navigate('/dashboard/student');
    }
  }, [type, navigate]);

  // Load existing application if editing
  useEffect(() => {
    if (isEditing && id && internshipApplications) {
      const existingApp = internshipApplications.find(app => app._id === id);
      if (existingApp) {
        setApplication(existingApp);
        const details = existingApp.details || {};
        setValue('companyName', details.companyName || '');
        setValue('location', details.location || '');
        setValue('startDate', details.startDate ? new Date(details.startDate).toISOString().split('T')[0] : '');
        setValue('endDate', details.endDate ? new Date(details.endDate).toISOString().split('T')[0] : '');
        setValue('mentorName', details.mentorName || '');
        setValue('mentorEmail', details.mentorEmail || '');
        setValue('mentorPhone', details.mentorPhone || '');
        setValue('roleOrNatureOfWork', details.roleOrNatureOfWork || '');
        setValue('mode', details.mode || 'onsite');
        setValue('hasStipend', details.hasStipend || (details.stipendRs > 0 ? 'yes' : 'no'));
        setValue('stipendRs', details.stipendRs || 0);
        setValue('offerLetterLink', details.offerLetterLink || '');
        setValue('completionCertificateLink', details.completionCertificateLink || '');
      }
    }
  }, [isEditing, id, internshipApplications, setValue]);

  // Load window status
  useEffect(() => {
    const checkWindow = async () => {
      try {
        // Use correct window key based on semester
        const windowKey = type === '6month' 
          ? (isSem8 ? 'sem8.sixMonthSubmissionWindow' : 'sem7.sixMonthSubmissionWindow')
          : (isSem8 ? 'sem8.internship2.evidenceWindow' : 'sem7.internship2.evidenceWindow');
        const response = await studentAPI.getSystemConfig(windowKey);
        if (response.success && response.data) {
          setWindowStatus(response.data);
        }
      } catch (error) {
        console.error('Failed to check window status:', error);
      }
    };
    if (type) checkWindow();
  }, [type, isSem8]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      // Validate required inputs
      if (type === '6month' && !data.offerLetterLink) {
        toast.error('Offer letter link is required for 6-month internship');
        return;
      }

      if (type === 'summer' && !data.completionCertificateLink) {
        toast.error('Completion certificate link is required for summer internship');
        return;
      }

      // Prepare details object
      const details = {
        companyName: data.companyName,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        mentorName: data.mentorName,
        mentorEmail: data.mentorEmail,
        mentorPhone: data.mentorPhone,
        roleOrNatureOfWork: data.roleOrNatureOfWork,
        mode: data.mode,
        hasStipend: data.hasStipend || 'no',
        stipendRs: data.hasStipend === 'yes' ? (parseFloat(data.stipendRs) || 0) : 0,
        ...(type === '6month' 
          ? { offerLetterLink: data.offerLetterLink } 
          : { 
              completionCertificateLink: data.completionCertificateLink
            }
        )
      };

      if (isEditing && id) {
        // Update existing application
        await updateInternshipApplication(id, details, null); // No files needed
      } else {
        // Create new application
        await createInternshipApplication(type, details, null); // No files needed
      }

      toast.success(isEditing ? 'Application updated successfully!' : 'Application submitted successfully!');
      
      // Navigate based on application type and semester
      const currentSemester = roleData?.semester || user?.semester;
      if (type === 'summer') {
        // For summer internships, navigate to appropriate dashboard based on semester
        if (currentSemester === 8) {
          // Sem 8: Navigate to Internship 2 Dashboard
          navigate('/student/sem8/internship2/dashboard');
        } else {
          // Sem 7: Navigate to Internship 1 Dashboard
          navigate('/student/sem7/internship1/dashboard');
        }
      } else {
        // For 6-month internships, navigate to student dashboard
        navigate('/dashboard/student');
      }
    } catch (error) {
      toast.error(`Failed to ${isEditing ? 'update' : 'submit'} application: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if window is open
  const isWindowOpen = () => {
    if (!windowStatus || !windowStatus.value) return true;
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
      return true;
    }
  };

  const canEdit = application && ['submitted', 'needs_info'].includes(application.status);
  const windowOpen = isWindowOpen();

  // Watch form data for checklist
  const formData = watch();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen bg-surface-200">
          <div className="text-center">
            <FiLoader className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
            <p className="mt-4 text-neutral-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const formTitle = type === '6month' ? '6-Month Internship Application' : 'Summer Internship Evidence Submission';
  const formSubtitle = type === '6month' 
    ? 'Submit your 6-month internship company details and offer letter'
    : 'Submit evidence of your completed 2-month summer internship';
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-64px)] bg-surface-200 overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="bg-white border-b border-neutral-200 shadow-sm flex-shrink-0">
          <div className="max-w-full mx-auto px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard/student')}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5 text-neutral-600" />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiBriefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-neutral-800">
                    {formTitle}
                  </h1>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {formSubtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - 2 Column Layout */}
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* Left Column - Form */}
            <div className="lg:col-span-8 bg-surface-50 overflow-y-auto custom-scrollbar min-h-0 h-full">
              <div className="p-4 lg:p-6 space-y-4 pb-6">
                
                {/* Application Status Banner (When Editing) */}
                {application && (
                  <div className={`rounded-xl p-4 border ${
                    application.status === 'needs_info' 
                      ? 'bg-warning-50 border-warning-200' 
                      : 'bg-info-50 border-info-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {application.status === 'needs_info' ? (
                        <FiAlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <FiInfo className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-neutral-900 text-sm">Application Status</h3>
                          <StatusBadge 
                            status={
                              application.status === 'verified_pass' ? 'success' : 
                              application.status === 'verified_fail' || application.status === 'absent' ? 'error' : 
                              application.status === 'needs_info' ? 'error' : 
                              application.status === 'pending_verification' ? 'info' : 
                              application.status === 'submitted' ? 'info' : 
                              'warning'
                            } 
                            text={
                              application.status === 'verified_pass' ? 'Verified (Pass)' :
                              application.status === 'verified_fail' ? 'Verified (Fail)' :
                              application.status === 'absent' ? 'Absent' :
                              application.status === 'needs_info' ? 'Update Required' :
                              application.status === 'pending_verification' ? 'Pending Verification' :
                              application.status === 'submitted' ? 'Submitted' :
                              application.status.charAt(0).toUpperCase() + application.status.slice(1).replace('_', ' ')
                            } 
                          />
                        </div>
                        {application.adminRemarks && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-neutral-200">
                            <p className="text-xs font-medium text-neutral-700 mb-1">Admin Remarks:</p>
                            <p className="text-xs text-neutral-600">{application.adminRemarks}</p>
                          </div>
                        )}
                        {!canEdit && (
                          <p className="text-xs text-neutral-600 mt-2">
                            This application cannot be edited. Please contact admin if you need to make changes.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Window Status Banner */}
                {!windowOpen && (
                  <div className="bg-warning-50 border-l-4 border-warning-400 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FiAlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-warning-900 mb-1 text-sm">Submission Window Closed</h3>
                        <p className="text-xs text-warning-800">
                          The submission window is currently closed. Please contact admin for more information.
                        </p>
                        {windowStatus?.value && (() => {
                          try {
                            const windowData = typeof windowStatus.value === 'string' 
                              ? JSON.parse(windowStatus.value) 
                              : windowStatus.value;
                            if (windowData.start || windowData.end) {
                              return (
                                <p className="text-xs text-warning-700 mt-2">
                                  {windowData.start && windowData.end 
                                    ? `Window: ${new Date(windowData.start).toLocaleDateString()} - ${new Date(windowData.end).toLocaleDateString()}`
                                    : windowData.start 
                                      ? `Opens: ${new Date(windowData.start).toLocaleDateString()}`
                                      : `Closes: ${new Date(windowData.end).toLocaleDateString()}`}
                                </p>
                              );
                            }
                          } catch (e) {}
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Form */}
                {(canEdit || !isEditing) && windowOpen && (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    
                    {/* Company Information Section */}
                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FiBriefcase className="w-5 h-5 text-white" />
                          <h2 className="text-lg font-bold text-white">
                            Company Information
                          </h2>
                        </div>
                      </div>
                      <div className="p-5 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              Company Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              {...register('companyName', { required: 'Company name is required' })}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Enter company name"
                            />
                            {errors.companyName && (
                              <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              <div className="flex items-center gap-1">
                                <FiMapPin className="w-3 h-3" />
                                Location
                              </div>
                            </label>
                            <input
                              type="text"
                              {...register('location')}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Enter location (optional)"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              <div className="flex items-center gap-1">
                                <FiCalendar className="w-3 h-3" />
                                Start Date <span className="text-red-500">*</span>
                              </div>
                            </label>
                            <input
                              type="date"
                              {...register('startDate', { required: 'Start date is required' })}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                            {errors.startDate && (
                              <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              <div className="flex items-center gap-1">
                                <FiCalendar className="w-3 h-3" />
                                End Date <span className="text-red-500">*</span>
                              </div>
                            </label>
                            <input
                              type="date"
                              {...register('endDate', { required: 'End date is required' })}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                            {errors.endDate && (
                              <p className="mt-1 text-xs text-red-600">{errors.endDate.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              Mode <span className="text-red-500">*</span>
                            </label>
                            <select
                              {...register('mode', { required: 'Mode is required' })}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white"
                            >
                              <option value="onsite">Onsite</option>
                              <option value="remote">Remote</option>
                              <option value="hybrid">Hybrid</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              <div className="flex items-center gap-1">
                                <FiDollarSign className="w-3 h-3" />
                                Stipend/Salary? <span className="text-red-500">*</span>
                              </div>
                            </label>
                            <select
                              {...register('hasStipend', { required: 'Please select an option' })}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white"
                            >
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                            {errors.hasStipend && (
                              <p className="mt-1 text-xs text-red-600">{errors.hasStipend.message}</p>
                            )}
                          </div>

                          {watch('hasStipend') === 'yes' && (
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                                Monthly Stipend (Rs.) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                {...register('stipendRs', { 
                                  required: watch('hasStipend') === 'yes' ? 'Stipend amount is required' : false,
                                  min: 0,
                                  validate: (value) => {
                                    if (watch('hasStipend') === 'yes' && (!value || value <= 0)) {
                                      return 'Please enter a valid stipend amount';
                                    }
                                    return true;
                                  }
                                })}
                                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="Enter monthly stipend amount"
                              />
                              {errors.stipendRs && (
                                <p className="mt-1 text-xs text-red-600">{errors.stipendRs.message}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                            Nature of Work / Role <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            {...register('roleOrNatureOfWork', { required: 'Nature of work is required' })}
                            rows={4}
                            className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                            placeholder="Describe your role, responsibilities, and nature of work during the internship"
                          />
                          {errors.roleOrNatureOfWork && (
                            <p className="mt-1 text-xs text-red-600">{errors.roleOrNatureOfWork.message}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Manager Details Section */}
                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-info-500 to-info-600 px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FiUser className="w-5 h-5 text-white" />
                          <h2 className="text-lg font-bold text-white">
                            Manager/Contact Details
                          </h2>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              Manager Name
                            </label>
                            <input
                              type="text"
                              {...register('mentorName')}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Enter manager name (optional)"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              <div className="flex items-center gap-1">
                                <FiMail className="w-3 h-3" />
                                Manager Email
                              </div>
                            </label>
                            <input
                              type="email"
                              {...register('mentorEmail')}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Enter email (optional)"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              <div className="flex items-center gap-1">
                                <FiPhone className="w-3 h-3" />
                                Manager Phone
                              </div>
                            </label>
                            <input
                              type="tel"
                              {...register('mentorPhone')}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Enter phone number (optional)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Required Documents Section */}
                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FiFileText className="w-5 h-5 text-white" />
                          <h2 className="text-lg font-bold text-white">
                            Required Documents
                          </h2>
                        </div>
                      </div>
                      <div className="p-5">
                        {type === '6month' ? (
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              <div className="flex items-center gap-1">
                                <FiLink className="w-3 h-3" />
                                Offer Letter Link <span className="text-red-500">*</span>
                              </div>
                            </label>
                            <input
                              type="url"
                              {...register('offerLetterLink', { 
                                required: 'Offer letter link is required', 
                                pattern: { 
                                  value: /^https?:\/\//i, 
                                  message: 'Enter a valid URL' 
                                } 
                              })}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="https://drive.google.com/..."
                            />
                            {errors.offerLetterLink && (
                              <p className="mt-1 text-xs text-red-600">{errors.offerLetterLink.message}</p>
                            )}
                            <p className="mt-2 text-xs text-neutral-600">
                              Upload your offer letter to Google Drive and share the link here
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-2 uppercase tracking-wide">
                              <div className="flex items-center gap-1">
                                <FiLink className="w-3 h-3" />
                                Completion Certificate Link <span className="text-red-500">*</span>
                              </div>
                            </label>
                            <input
                              type="url"
                              {...register('completionCertificateLink', { 
                                required: 'Completion certificate link is required',
                                pattern: {
                                  value: /^https?:\/\//i,
                                  message: 'Enter a valid URL'
                                }
                              })}
                              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="https://drive.google.com/..."
                            />
                            {errors.completionCertificateLink && (
                              <p className="mt-1 text-xs text-red-600">{errors.completionCertificateLink.message}</p>
                            )}
                            <p className="mt-2 text-xs text-neutral-600">
                              Upload your sealed and signed summer internship completion certificate to Google Drive and share the link here. Make sure the link is publicly accessible or shared with admin.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/student')}
                        className="px-5 py-2.5 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <FiLoader className="w-4 h-4 animate-spin" />
                            {isEditing ? 'Updating...' : 'Submitting...'}
                          </>
                        ) : (
                          <>
                            <FiCheckCircle className="w-4 h-4" />
                            {isEditing ? 'Update Application' : 'Submit Application'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Read-only submitted details when editing is blocked (e.g., verified pass) */}
                {!canEdit && isEditing && application && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FiInfo className="w-5 h-5 text-white" />
                          <h2 className="text-lg font-bold text-white">
                            Submitted Details (View Only)
                          </h2>
                        </div>
                      </div>
                      <div className="p-5 space-y-5 text-sm text-neutral-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs uppercase text-neutral-500 font-semibold">Company Name</p>
                            <p className="mt-1">{application.details?.companyName || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-neutral-500 font-semibold">Location</p>
                            <p className="mt-1">{application.details?.location || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-neutral-500 font-semibold">Start Date</p>
                            <p className="mt-1">{formatDate(application.details?.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-neutral-500 font-semibold">End Date</p>
                            <p className="mt-1">{formatDate(application.details?.endDate)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-neutral-500 font-semibold">Mode</p>
                            <p className="mt-1 text-neutral-900 capitalize">{application.details?.mode || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-neutral-500 font-semibold">Stipend</p>
                            <p className="mt-1">
                              {application.details?.hasStipend === 'yes'
                                ? `Yes${application.details?.stipendRs ? ` - ₹${application.details.stipendRs}` : ''}`
                                : 'No'}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs uppercase text-neutral-500 font-semibold">Nature of Work / Role</p>
                            <p className="mt-1 whitespace-pre-wrap">{application.details?.roleOrNatureOfWork || '—'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs uppercase text-neutral-500 font-semibold">Manager Name</p>
                            <p className="mt-1">{application.details?.mentorName || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-neutral-500 font-semibold">Manager Email</p>
                            <p className="mt-1 break-all">{application.details?.mentorEmail || '—'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs uppercase text-neutral-500 font-semibold">Manager Phone</p>
                            <p className="mt-1 break-all">{application.details?.mentorPhone || '—'}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {type === '6month' ? (
                            <div>
                              <p className="text-xs uppercase text-neutral-500 font-semibold">Offer Letter Link</p>
                              {application.details?.offerLetterLink ? (
                                <a
                                  href={application.details.offerLetterLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 break-all"
                                >
                                  <FiLink className="w-4 h-4" />
                                  {application.details.offerLetterLink}
                                </a>
                              ) : (
                                <p className="mt-1">—</p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs uppercase text-neutral-500 font-semibold">Completion Certificate Link</p>
                              {application.details?.completionCertificateLink ? (
                                <a
                                  href={application.details.completionCertificateLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 break-all"
                                >
                                  <FiLink className="w-4 h-4" />
                                  {application.details.completionCertificateLink}
                                </a>
                              ) : (
                                <p className="mt-1">—</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Information & Tips */}
            <div className="lg:col-span-4 bg-surface-100 border-l border-neutral-200 overflow-y-auto custom-scrollbar min-h-0 h-full">
              <div className="p-4 space-y-4">
                
                {/* Submission Progress */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FiTarget className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Submission Progress
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {formData.companyName && formData.startDate && formData.endDate && formData.mode && formData.roleOrNatureOfWork ? (
                        <FiCheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 flex-shrink-0" />
                      )}
                      <span className="text-xs text-neutral-700">Company Information</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.mentorName || formData.mentorEmail || formData.mentorPhone ? (
                        <FiCheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 flex-shrink-0" />
                      )}
                      <span className="text-xs text-neutral-700">Manager Details (Optional)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(type === 'summer' && formData.completionCertificateLink) || (type === '6month' && formData.offerLetterLink) ? (
                        <FiCheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300 flex-shrink-0" />
                      )}
                      <span className="text-xs text-neutral-700">Required Documents</span>
                    </div>
                  </div>
                </div>

                {/* About Summer Internship / 6-Month */}
                <div className="bg-info-50 rounded-xl p-4 border border-info-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FiInfo className="w-4 h-4 text-info-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      About {type === 'summer' ? 'Summer Internship' : '6-Month Internship'}
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs text-info-800">
                    {type === 'summer' ? (
                      <>
                        <p>• <strong>Purpose:</strong> Submit evidence of completed 2-month summer internship</p>
                        <p>• <strong>Eligibility:</strong> Students who have completed a summer internship</p>
                        <p>• <strong>Required:</strong> Completion certificate (Google Drive link)</p>
                        <p>• <strong>Optional:</strong> Manager details, nature of work, stipend information</p>
                        <p>• <strong>Next Steps:</strong> Admin reviews and approves/rejects</p>
                      </>
                    ) : (
                      <>
                        <p>• <strong>Purpose:</strong> Submit 6-month internship company details and offer letter</p>
                        <p>• <strong>Required:</strong> Offer letter link (Google Drive)</p>
                        <p>• <strong>Optional:</strong> Manager details, nature of work, stipend information</p>
                        <p>• <strong>Next Steps:</strong> Admin reviews and verifies</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Required Documents */}
                <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FiFileText className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Required Documents
                    </h3>
                  </div>
                  <div className="space-y-2 text-xs text-neutral-700">
                    {type === 'summer' ? (
                      <>
                        <p>• <strong>Completion Certificate:</strong> Required</p>
                        <p>• Upload to Google Drive and share link</p>
                        <p>• Format: PDF or image</p>
                        <p>• Must be sealed and signed</p>
                        <p>• Link must be publicly accessible or shared with admin</p>
                      </>
                    ) : (
                      <>
                        <p>• <strong>Offer Letter:</strong> Required</p>
                        <p>• Upload to Google Drive and share link</p>
                        <p>• Format: PDF or image</p>
                        <p>• Link must be publicly accessible or shared with admin</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Tips & Guidelines */}
                <div className="bg-warning-50 rounded-xl p-4 border border-warning-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FiZap className="w-4 h-4 text-warning-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Tips & Guidelines
                    </h3>
                  </div>
                  <div className="space-y-1.5 text-xs text-warning-800">
                    <p>• Ensure all dates are accurate</p>
                    <p>• Upload document to Google Drive first</p>
                    <p>• Make sure the link is accessible</p>
                    <p>• Provide accurate manager contact information</p>
                    <p>• Describe your role clearly in nature of work</p>
                    <p>• Double-check stipend amount if applicable</p>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-surface-100 rounded-xl p-4 border border-neutral-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FiAlertTriangle className="w-4 h-4 text-warning-600" />
                    <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                      Important Notes
                    </h3>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-neutral-700">
                    <p>• Submission window may be restricted (check dates)</p>
                    <p>• Application can be edited if status is "submitted" or "needs_info"</p>
                    <p>• Admin may request additional information</p>
                    {type === 'summer' && (
                      <>
                        <p>• Approval means {isSem8 ? 'Internship 2' : 'Internship 1'} project is not required</p>
                        <p>• Rejection means you must register for {isSem8 ? 'Internship 2' : 'Internship 1'} solo project</p>
                      </>
                    )}
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

export default InternshipApplicationForm;
