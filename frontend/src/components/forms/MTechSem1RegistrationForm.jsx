import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../utils/api';
import FacultySelector from '../faculty/FacultySelector';
import toast from 'react-hot-toast';

const MTechSem1RegistrationForm = () => {
  const navigate = useNavigate();
  const { user, roleData, refreshUserData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFaculties, setSelectedFaculties] = useState([]);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      title: '',
      projectType: 'minor1',
      semester: 1,
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    },
  });

  React.useEffect(() => {
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    setValue('academicYear', academicYear);
  }, [setValue]);

  // Guard: Only M.Tech Sem 1 can access
  React.useEffect(() => {
    const degree = roleData?.degree || user?.degree;
    const semester = roleData?.semester || user?.semester;
    if (degree && degree !== 'M.Tech') {
      toast.error('This registration is only for M.Tech Semester 1.');
      navigate('/dashboard/student', { replace: true });
    } else if (semester && Number(semester) !== 1) {
      toast.error('This registration is available in Semester 1 only.');
      navigate('/dashboard/student', { replace: true });
    }
  }, [roleData, user, navigate]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        facultyPreferences: selectedFaculties.map((f, idx) => ({ faculty: f._id || f.faculty || f, priority: f.priority || (idx + 1) }))
      };
      const result = await studentAPI.registerProject(payload);
      toast.success('Project registered successfully!');
      await refreshUserData();
      navigate('/dashboard/student');
      return result;
    } catch (error) {
      toast.error(error.message || 'Failed to register project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Register Minor Project 1</h1>
        <p className="text-gray-600 mt-2">Register your individual project for M.Tech 1st semester</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">About Minor Project 1</h2>
        <div className="text-blue-800 space-y-2 text-sm">
          <p>• <strong>Individual Project:</strong> For M.Tech 1st semester students</p>
          <p>• <strong>Focus:</strong> Problem-solving</p>
          <p>• <strong>Deliverables:</strong> Working application + PPT presentation</p>
          <p>• <strong>Evaluation:</strong> 100% internal assessment by faculty panel</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Two-column layout: left = Student Info, right = Faculty Preferences */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
              <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {user?.email || 'Not available'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name of the Student</label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {roleData?.fullName || user?.name || 'Not available'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MIS Number</label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {roleData?.misNumber || 'Not available'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact No</label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {roleData?.contactNumber || 'Not available'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {roleData?.branch || 'Not available'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-600">
                  {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Faculty Preferences</h3>
              <FacultySelector selectedFaculties={selectedFaculties} onSelectionChange={setSelectedFaculties} maxSelections={5} twoColumnSelected={false} autoCloseOnMax={true} />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">Proposed Project Title/Area <span className="text-red-500">*</span></label>
              <textarea id="title" rows={3} {...register('title', { required: 'Project title is required' })} className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.title ? 'border-red-300' : 'border-gray-300'}`} placeholder="Enter your proposed project title or area of work..." />
              {errors.title && (<p className="mt-1 text-sm text-red-600">{errors.title.message}</p>)}
            </div>
          </div>

          <input type="hidden" {...register('projectType')} value="minor1" />
          <input type="hidden" {...register('semester')} value={1} />
          <input type="hidden" {...register('academicYear')} value={`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`} />

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button type="button" onClick={() => navigate('/dashboard/student')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </span>
              ) : (
                'Register Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MTechSem1RegistrationForm;


