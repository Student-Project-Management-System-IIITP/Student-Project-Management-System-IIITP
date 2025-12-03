import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSem4Project } from '../../hooks/useSem4Project';
import toast from 'react-hot-toast';
import StatusBadge from '../common/StatusBadge';
import { 
  FiCheckCircle, FiAlertCircle, FiFileText, FiUser, 
  FiMail, FiPhone, FiHash, FiBook, FiClock 
} from 'react-icons/fi';

const ProjectRegistrationForm = () => {
  const navigate = useNavigate();
  const { user, roleData, refreshUserData } = useAuth();
  const { registerProject, loading, error } = useSem4Project();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      title: '',
      projectType: 'minor1',
      semester: 4,
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    },
  });

  // Auto-fill academic year
  React.useEffect(() => {
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    setValue('academicYear', academicYear);
  }, [setValue]);

  // Guard: Only B.Tech Sem 4 students can access this form
  React.useEffect(() => {
    const degree = roleData?.degree || user?.degree;
    const semester = roleData?.semester || user?.semester;
    if (degree && degree !== 'B.Tech') {
      toast.error('This registration is only for B.Tech Semester 4.');
      navigate('/dashboard/student', { replace: true });
    } else if (semester && Number(semester) !== 4) {
      toast.error('This registration is available in Semester 4 only.');
      navigate('/dashboard/student', { replace: true });
    }
  }, [roleData, user, navigate]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await registerProject(data);
      toast.success('Project registered successfully!');
      
      // Refresh user data to update navbar and other components
      await refreshUserData();
      
      // Navigate to dashboard
      navigate('/dashboard/student');
    } catch (error) {
      toast.error(error.message || 'Failed to register project');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50">
      {/* Compact Header Section */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiFileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-800">
                Register Minor Project 1
              </h1>
              <p className="text-xs text-neutral-600 mt-0.5">
                B.Tech Sem 4 • Research & Presentation
        </p>
      </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-5 pb-8">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left Column - Registration Form (60%) */}
          <div className="lg:col-span-3 space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Student Information Card */}
              <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <FiUser className="w-5 h-5 text-white" />
                    <h3 className="text-base font-semibold text-white">Student Information</h3>
                  </div>
        </div>
        
                <div className="p-5 space-y-3">
                  {/* Email and Name - Two columns */}
                  <div className="grid md:grid-cols-2 gap-3">
              <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 mb-1">
                        <FiMail className="w-3 h-3" />
                  Email Address
                </label>
                      <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-800">
                  {user?.email || 'Not available'}
                </div>
              </div>

              <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 mb-1">
                        <FiUser className="w-3 h-3" />
                        Full Name
                </label>
                      <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-800">
                  {roleData?.fullName || user?.name || 'Not available'}
                      </div>
                </div>
              </div>

                  {/* MIS, Contact, Branch - Three columns */}
                  <div className="grid md:grid-cols-3 gap-3">
              <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 mb-1">
                        <FiHash className="w-3 h-3" />
                  MIS Number
                </label>
                      <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-800">
                  {roleData?.misNumber || 'Not available'}
                </div>
              </div>

              <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 mb-1">
                        <FiPhone className="w-3 h-3" />
                  Contact No
                </label>
                      <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-800">
                  {roleData?.contactNumber || 'Not available'}
                </div>
              </div>

              <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 mb-1">
                        <FiBook className="w-3 h-3" />
                  Branch
                </label>
                      <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-800">
                  {roleData?.branch || 'Not available'}
                      </div>
                </div>
              </div>

              {/* Timestamp */}
              <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 mb-1">
                      <FiClock className="w-3 h-3" />
                      Registration Time
                </label>
                    <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-800">
                  {new Date().toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    hour: '2-digit',
                        minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>

              {/* Project Information Card */}
              <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <FiFileText className="w-5 h-5 text-white" />
                    <h3 className="text-base font-semibold text-white">Project Details</h3>
                  </div>
                </div>
                
                <div className="p-5">
                  {/* Research Topic/Title */}
            <div>
                    <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-2">
                      Research Topic/Title <span className="text-error-600">*</span>
              </label>
              <textarea
                id="title"
                      rows={4}
                {...register('title', {
                        required: 'Research topic is required',
                })}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-700 placeholder-neutral-400 transition-colors ${
                        errors.title ? 'border-error-300 focus:ring-error-500' : 'border-neutral-300'
                }`}
                      placeholder="Enter your research topic... e.g., 'Machine Learning Applications in Healthcare', 'Blockchain Technology and Its Use Cases', 'Cloud Computing Architecture'..."
              />
              {errors.title && (
                      <p className="mt-2 text-sm text-error-600 flex items-center gap-1">
                        <FiAlertCircle className="w-4 h-4" />
                        {errors.title.message}
                      </p>
              )}
                    <p className="mt-2 text-xs text-neutral-500">
                      Choose a technology/concept you want to research. You'll study research papers and create a presentation on this topic.
                    </p>
                  </div>
            </div>
          </div>

          {/* Hidden fields for backend submission */}
          <input type="hidden" {...register('projectType')} value="minor1" />
          <input type="hidden" {...register('semester')} value={4} />
          <input type="hidden" {...register('academicYear')} value={`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`} />

          {/* Error Display */}
          {error && (
                <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-error-800">Registration Failed</h3>
                      <p className="mt-1 text-sm text-error-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
              <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/student')}
                  className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || loading}
                  className="flex-1 btn-primary"
            >
              {isSubmitting || loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </span>
              ) : (
                    <span className="flex items-center justify-center gap-2">
                      <FiCheckCircle className="w-4 h-4" />
                      Register Project
                    </span>
              )}
            </button>
          </div>
        </form>
      </div>

          {/* Right Column - Guidelines & Tips (40%) */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-5 space-y-4 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto custom-scrollbar">
      {/* Guidelines Card */}
              <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="bg-gradient-to-r from-accent-500 to-accent-600 px-5 py-3">
                <div className="flex items-center gap-2">
                  <FiFileText className="w-5 h-5 text-white" />
                  <h3 className="text-base font-semibold text-white">Registration Guidelines</h3>
                </div>
              </div>
              
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-800">Choose Wisely</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">Pick a topic with sufficient research papers and resources</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-800">Research Depth</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">Study multiple research papers on your chosen topic</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-800">Clear Presentation</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">Create a well-structured, informative PPT</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-800">Understand Concepts</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">Be ready to answer questions about your topic</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-4 h-4 text-success-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-800">Cite Sources</h4>
                    <p className="text-xs text-neutral-600 mt-0.5">Include references to research papers in your PPT</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What's Next Card */}
            <div className="bg-info-50 rounded-xl border border-info-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FiAlertCircle className="w-5 h-5 text-info-600" />
                <h3 className="text-sm font-semibold text-info-800">What's Next?</h3>
              </div>
              <div className="text-xs text-info-700 space-y-2">
                <p><strong>1.</strong> Start researching your chosen topic</p>
                <p><strong>2.</strong> Read relevant research papers and documentation</p>
                <p><strong>3.</strong> Wait for evaluation schedule notification</p>
                <p><strong>4.</strong> Create and upload your PPT before evaluation date</p>
                <p><strong>5.</strong> Present to panel and answer questions</p>
              </div>
            </div>

            {/* Project Requirements */}
            <div className="bg-purple-50 rounded-xl border border-purple-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FiBook className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-semibold text-purple-800">Project Requirements</h3>
              </div>
              <div className="text-xs text-purple-700 space-y-2">
                <p>• <strong>Type:</strong> Individual research & presentation</p>
                <p>• <strong>Duration:</strong> 3-4 months (full semester)</p>
                <p>• <strong>Work:</strong> Study research papers, no implementation</p>
                <p>• <strong>Deliverables:</strong> PPT presentation only</p>
                <p>• <strong>Evaluation:</strong> Panel presentation + Q&A</p>
                <p>• <strong>Assessment:</strong> 100% internal evaluation</p>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectRegistrationForm;
