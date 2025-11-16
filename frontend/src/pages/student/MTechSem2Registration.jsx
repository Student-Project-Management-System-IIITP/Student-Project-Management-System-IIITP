import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';

const MTechSem2Registration = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [sem1Project, setSem1Project] = useState(null);
  const [faculty, setFaculty] = useState(null);
  const [canContinue, setCanContinue] = useState(false);
  const [projectChoice, setProjectChoice] = useState(null); // 'continue' | 'new'
  const [isContinuing, setIsContinuing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    defaultValues: {
      title: '',
      description: ''
    }
  });

  const watchedTitle = watch('title');
  const watchedDescription = watch('description');

  useEffect(() => {
    const degree = roleData?.degree || user?.degree;
    const semester = Number(roleData?.semester || user?.semester);

    if (degree !== 'M.Tech' || semester !== 2) {
      toast.error('M.Tech Semester 2 registration is only available for eligible students.');
      navigate('/dashboard/student', { replace: true });
      return;
    }

    const loadPreRegistrationData = async () => {
      try {
        setLoading(true);
        const response = await studentAPI.getMTechSem2PreRegistration();

        if (response.alreadyRegistered) {
          toast.success('Minor Project 2 is already registered.');
          navigate('/dashboard/student', { replace: true });
          return;
        }

        if (!response.success) {
          throw new Error(response.message || 'Failed to load registration data');
        }

        const data = response.data || {};
        setSem1Project(data.previousProject || null);
        setFaculty(data.faculty || null);
        setCanContinue(!!data.canContinue);

        if (!data.canContinue) {
          setProjectChoice('new');
          setIsContinuing(false);
        } else {
          setProjectChoice(null);
          setIsContinuing(null);
        }
      } catch (error) {
        console.error('Error loading M.Tech Sem 2 registration data:', error);
        toast.error(error.message || 'Failed to load registration data');
        navigate('/dashboard/student', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadPreRegistrationData();
  }, [navigate, roleData, user]);

  const handleContinueChoice = () => {
    if (!canContinue) return;
    setProjectChoice('continue');
    setIsContinuing(true);
  };

  const handleNewChoice = () => {
    setProjectChoice('new');
    setIsContinuing(false);
  };

  const onSubmit = async (formData) => {
    if (!projectChoice) {
      toast.error('Please choose to continue or start a new project');
      return;
    }

    if (projectChoice === 'new' && (!formData.title?.trim() || !formData.description?.trim())) {
      toast.error('Please provide project title and description');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        isContinuing: projectChoice === 'continue',
        previousProjectId: sem1Project?._id || null,
        title: projectChoice === 'new' ? formData.title.trim() : undefined,
        description: projectChoice === 'new' ? formData.description.trim() : undefined
      };

      const response = await studentAPI.registerMTechSem2Project(payload);

      if (response.success) {
        toast.success(response.message || 'Minor Project 2 registered successfully!');
        navigate('/dashboard/student');
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Error registering M.Tech Sem 2 project:', error);
      toast.error(error.message || 'Failed to register project');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center">
                {step === 1 && 'Review'}
                {step === 2 && 'Faculty'}
                {step === 3 && 'Project'}
              </div>
            </div>
            {step < 3 && (
              <div
                className={`flex-1 h-1 mx-3 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Review Semester 1 Project</h2>
        <p className="text-gray-600">
          Verify your previous semester project details. You can continue with the same project or start a new one.
        </p>
      </div>

      {!sem1Project ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Minor Project 1 found</h3>
          <p className="text-yellow-700 text-sm">
            We could not locate a Minor Project 1 record for you. You can still proceed by registering a new project for Semester 2.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{sem1Project.title}</h3>
          <div className="text-sm text-gray-700 space-y-3">
            <div>
              <span className="font-medium text-gray-900">Description:</span>
              <p className="mt-1 text-gray-700 whitespace-pre-line">
                {sem1Project.description || 'No description available'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="font-medium text-gray-900">Status:</span>
                <p className="text-gray-700 capitalize">{sem1Project.status || 'registered'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-900">Academic Year:</span>
                <p className="text-gray-700">{sem1Project.academicYear || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-900">Faculty Allocated:</span>
                <p className="text-gray-700">
                  {sem1Project.faculty
                    ? sem1Project.faculty.fullName || 'Faculty Assigned'
                    : 'Pending'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard/student')}
          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Faculty Information</h2>
        <p className="text-gray-600">
          Your Semester 1 faculty guide will remain assigned for Semester 2 projects.
        </p>
      </div>

      {!faculty ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Faculty Allocation Pending</h3>
          <p className="text-yellow-700 text-sm">
            No faculty has been assigned to your project yet. You can proceed, but please reach out to the administration if this persists.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👨‍🏫</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {faculty.fullName || 'Faculty Supervisor'}
              </h3>
              <div className="text-sm text-gray-700 space-y-1">
                {faculty.department && (
                  <p>
                    <span className="font-medium text-gray-900">Department:</span> {faculty.department}
                  </p>
                )}
                {faculty.designation && (
                  <p>
                    <span className="font-medium text-gray-900">Designation:</span> {faculty.designation}
                  </p>
                )}
                {faculty.email && (
                  <p>
                    <span className="font-medium text-gray-900">Email:</span> {faculty.email}
                  </p>
                )}
                {faculty.phone && (
                  <p>
                    <span className="font-medium text-gray-900">Phone:</span> {faculty.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 3: Choose Your Path</h2>
        <p className="text-gray-600">
          Decide whether to continue your Semester 1 project or start a new project for Semester 2.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={handleContinueChoice}
          className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
            projectChoice === 'continue'
              ? 'border-blue-500 bg-blue-50'
              : canContinue
              ? 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
              : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="text-center space-y-3">
            <div className="text-4xl">🔄</div>
            <h3 className="text-lg font-semibold text-gray-900">Continue Minor Project 1</h3>
            <p className="text-sm text-gray-600">
              Carry forward your Semester 1 project as Minor Project 2 with the same faculty mentor.
            </p>
            {!canContinue && (
              <p className="text-xs text-red-600">
                Continuation is unavailable because no Semester 1 project was found.
              </p>
            )}
          </div>
        </div>

        <div
          onClick={handleNewChoice}
          className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
            projectChoice === 'new'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <div className="text-center space-y-3">
            <div className="text-4xl">✨</div>
            <h3 className="text-lg font-semibold text-gray-900">Start a New Project</h3>
            <p className="text-sm text-gray-600">
              Begin a fresh project for Semester 2 while continuing with the same faculty mentor.
            </p>
          </div>
        </div>
      </div>

      {projectChoice === 'new' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              {...register('title', {
                required: 'Project title is required',
                minLength: {
                  value: 5,
                  message: 'Title must be at least 5 characters long'
                }
              })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter the title for Minor Project 2"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Project Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              rows={6}
              {...register('description', {
                required: 'Project description is required',
                minLength: {
                  value: 20,
                  message: 'Description must be at least 20 characters long'
                }
              })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe the objectives, scope, and deliverables for your new project..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
        </form>
      )}

      {projectChoice === 'continue' && sem1Project && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p>
            Your Semester 1 project <strong>{sem1Project.title}</strong> will be continued as Minor Project 2 with the same details and faculty supervisor.
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={
            submitting ||
            !projectChoice ||
            (projectChoice === 'new' && (!watchedTitle?.trim() || !watchedDescription?.trim()))
          }
          className={`px-6 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            submitting ||
            !projectChoice ||
            (projectChoice === 'new' && (!watchedTitle?.trim() || !watchedDescription?.trim()))
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {submitting ? 'Registering...' : 'Register Project'}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading registration data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {renderStepIndicator()}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
      </div>
    </Layout>
  );
};

export default MTechSem2Registration;



