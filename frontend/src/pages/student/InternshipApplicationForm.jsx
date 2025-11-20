import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useSem7Project } from '../../hooks/useSem7Project';
import { useSem8 } from '../../context/Sem8Context';
import { internshipAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';

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
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/student/system-config/${windowKey}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setWindowStatus(data.data);
          }
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {type === '6month' ? '6-Month Internship Application' : 'Summer Internship Evidence Submission'}
          </h1>
          <p className="text-gray-600">
            {type === '6month' 
              ? 'Submit your 6-month internship company details and offer letter'
              : 'Submit evidence of your completed 2-month summer internship'
            }
          </p>
        </div>

        {/* Application Status (if editing) */}
        {application && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Application Status</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Status: <StatusBadge 
                    status={application.status === 'approved' ? 'success' : 
                           application.status === 'rejected' ? 'error' : 
                           application.status === 'needs_info' ? 'error' : 'warning'} 
                    text={application.status.charAt(0).toUpperCase() + application.status.slice(1).replace('_', ' ')} 
                  />
                </p>
              </div>
            </div>
            
            {application.adminRemarks && (
              <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700">Admin Remarks:</p>
                <p className="text-sm text-gray-600 mt-1">{application.adminRemarks}</p>
              </div>
            )}
          </div>
        )}

        {/* Window Status */}
        {!windowOpen && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              The submission window is currently closed. Please contact admin for more information.
            </p>
          </div>
        )}

        {/* Can Edit Check */}
        {application && !canEdit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              This application cannot be edited. Status: {application.status}. Please contact admin if you need to make changes.
            </p>
          </div>
        )}

        {/* Form */}
        {(canEdit || !isEditing) && windowOpen && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('companyName', { required: 'Company name is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    {...register('location')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('startDate', { required: 'Start date is required' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="onsite">Onsite</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Are you getting Stipend/Salary? <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('hasStipend', { required: 'Please select an option' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  {errors.hasStipend && (
                    <p className="mt-1 text-sm text-red-600">{errors.hasStipend.message}</p>
                  )}
                </div>

                {watch('hasStipend') === 'yes' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                  {...register('roleOrNatureOfWork', { required: 'Nature of work is required' })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your role, responsibilities, and nature of work during the internship"
                />
                {errors.roleOrNatureOfWork && (
                  <p className="mt-1 text-sm text-red-600">{errors.roleOrNatureOfWork.message}</p>
                )}
              </div>
            </div>

            {/* Manager Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Manager/Contact Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager Name
                  </label>
                  <input
                    type="text"
                    {...register('mentorName')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager Email
                  </label>
                  <input
                    type="email"
                    {...register('mentorEmail')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager Phone
                  </label>
                  <input
                    type="tel"
                    {...register('mentorPhone')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 6-month: Offer Letter Link */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Documents</h2>
              {type === '6month' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Offer Letter Link <span className="text-red-500">*</span></label>
                  <input
                    type="url"
                    {...register('offerLetterLink', { required: 'Offer letter link is required', pattern: { value: /^https?:\/\//i, message: 'Enter a valid URL' } })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://drive.google.com/..."
                  />
                  {errors.offerLetterLink && (
                    <p className="mt-1 text-sm text-red-600">{errors.offerLetterLink.message}</p>
                  )}
                </div>
              )}

              {/* Summer: Completion Certificate Link */}
              {type === 'summer' && (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Completion Certificate Link (Google Drive) <span className="text-red-500">*</span>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://drive.google.com/..."
                    />
                    {errors.completionCertificateLink && (
                      <p className="mt-1 text-sm text-red-600">{errors.completionCertificateLink.message}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Upload your sealed and signed summer internship completion certificate to Google Drive and share the link here
                    </p>
                  </div>

                </>
              )}
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
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : (isEditing ? 'Update Application' : 'Submit Application')}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default InternshipApplicationForm;

