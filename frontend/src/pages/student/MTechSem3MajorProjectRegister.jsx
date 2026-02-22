import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useMTechSem3Track } from '../../hooks/useMTechSem3Track';
import { studentAPI } from '../../utils/api';

const MAX_PREFERENCES = 5;

const MTechSem3MajorProjectRegister = () => {
  const navigate = useNavigate();
  const { user, roleData } = useAuth();
  const { trackChoice, loading: trackLoading } = useMTechSem3Track();

  const [domains, setDomains] = useState([
    'Web Development',
    'Cybersecurity',
    'Artificial Intelligence & Machine Learning',
    'Data Science & Analytics',
    'Internet of Things',
    'Cloud Computing',
    'Software Engineering',
    'Human Computer Interaction',
    'Blockchain & FinTech',
    'Embedded Systems',
    'Computer Networks',
    'Database Systems',
    'Operating Systems',
    'Mobile App Development',
    'Game Development',
    'Other',
  ]);
  const [customDomain, setCustomDomain] = useState("");
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const degree = roleData?.degree || user?.degree;
  const currentSemester = roleData?.semester || user?.semester;
  const selectedTrack = trackChoice?.finalizedTrack || trackChoice?.chosenTrack;

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: '',
      domain: '',
      summary: ''
    }
  });

  useEffect(() => {
    if (trackLoading) return;
    if (degree !== 'M.Tech' || currentSemester !== 3) {
      toast.error('This page is only available for M.Tech Semester 3 students');
      navigate('/dashboard/student');
      return;
    }
    if (selectedTrack !== 'coursework') {
      toast.error('Please choose the Major Project track to continue.');
      navigate('/student/mtech/sem3/track-selection');
    }
  }, [degree, currentSemester, selectedTrack, navigate, trackLoading]);

  useEffect(() => {
    const loadFaculty = async () => {
      try {
        const response = await studentAPI.getFacultyList();
        if (response?.success) {
          setFacultyList(response.data || []);
        } else {
          throw new Error(response?.message || 'Failed to load faculty list');
        }
      } catch (error) {
        console.error('Failed to load faculty list:', error);
        toast.error(error.message || 'Failed to load faculty list');
        setFacultyList([]);
      }
    };

    const loadAll = async () => {
      setLoadingData(true);
      await Promise.all([loadFaculty()]);
      setLoadingData(false);
    };

    loadAll();
  }, []);

  const addFacultyPreference = (faculty) => {
    if (selectedFaculty.length >= MAX_PREFERENCES) {
      toast.error(`You can select up to ${MAX_PREFERENCES} preferences`);
      return;
    }
    if (selectedFaculty.some((entry) => entry.faculty._id === faculty._id)) {
      toast.error('Faculty already selected');
      return;
    }
    setSelectedFaculty((prev) => [
      ...prev,
      {
        faculty,
        priority: prev.length + 1
      }
    ]);
  };

  const removeFacultyPreference = (facultyId) => {
    setSelectedFaculty((prev) =>
      prev
        .filter((entry) => entry.faculty._id !== facultyId)
        .map((entry, index) => ({ ...entry, priority: index + 1 }))
    );
  };

  const departments = useMemo(() => {
    const deptSet = new Set(facultyList.map((f) => f.department?.trim()).filter(Boolean));
    return ['all', ...Array.from(deptSet).sort()];
  }, [facultyList]);

  const availableFaculty = useMemo(() => {
    return facultyList.filter((faculty) => {
      const matchesSearch = faculty.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept =
        selectedDepartment === 'all' ||
        faculty.department?.toLowerCase() === selectedDepartment.toLowerCase();
      const notSelected = !selectedFaculty.some((entry) => entry.faculty._id === faculty._id);
      return matchesSearch && matchesDept && notSelected;
    });
  }, [facultyList, selectedFaculty, searchTerm, selectedDepartment]);

  const onSubmit = async (data) => {
    if (selectedFaculty.length === 0) {
      toast.error('Please select at least one faculty preference');
      return;
    }
    try {
      setIsSubmitting(true);
      await studentAPI.registerMTechSem3MajorProject({
        title: data.title,
        domain: data.domain === 'Other' ? customDomain : data.domain,
        summary: data.summary,
        facultyPreferences: selectedFaculty.map((entry) => entry.faculty._id)
      });
      toast.success('Registration submitted. Please wait while faculty is allocated.');
      navigate('/student/mtech/sem3/major-project');
    } catch (error) {
      toast.error(error.message || 'Failed to register project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <p className="text-sm uppercase tracking-wide text-indigo-600 font-semibold">
            M.Tech Semester 3
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Register Major Project 1</h1>
          <p className="text-gray-600 mt-2">
            Provide your major project details and choose your preferred faculty mentors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase text-gray-500">Student</p>
            <p className="text-gray-900 font-semibold mt-1">{user?.name || 'Student'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase text-gray-500">MIS Number</p>
            <p className="text-gray-900 font-semibold mt-1">{roleData?.misNumber || '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
            <p className="text-xs uppercase text-gray-500">Status</p>
            <StatusBadge status="warning" text="Pending Registration" />
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-900">
          <p className="font-semibold text-indigo-950">About this registration</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>This is a solo project. Group formation is not required.</li>
            <li>Choose your project domain from the institute-approved list.</li>
            <li>Select up to {MAX_PREFERENCES} faculty members in order of preference.</li>
            <li>Admins will allocate faculty based on availability and your preferences.</li>
          </ul>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mr-3"></div>
            Loading registration form...
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Project Details
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('title', { required: 'Project title is required' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your proposed project title"
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('domain', { required: 'Please select a domain' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  defaultValue=""
                >
                  <option value="" disabled>Select a domain</option>
                  {domains.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
                {errors.domain && (
                  <p className="text-sm text-red-600 mt-1">{errors.domain.message}</p>
                )}
                {/* Show custom input if 'Other' is selected */}
                { (typeof window !== 'undefined' && document.querySelector('select[name="domain"]')?.value === 'Other') && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specify Domain *</label>
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter your custom domain"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary / Objective
                </label>
                <textarea
                  {...register('summary')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Briefly describe the problem statement and expected outcome"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Faculty Preferences
                </h2>
                <p className="text-sm text-gray-500">
                  Selected {selectedFaculty.length} / {MAX_PREFERENCES}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-gray-700">Available Faculty</p>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept === 'all' ? 'All Departments' : dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {availableFaculty.length === 0 ? (
                      <p className="text-sm text-gray-500 p-4">
                        No more faculty available to select.
                      </p>
                    ) : (
                      availableFaculty.map((faculty) => (
                        <button
                          type="button"
                          key={faculty._id}
                          onClick={() => addFacultyPreference(faculty)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between items-center text-sm text-gray-700"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{faculty.fullName}</p>
                            <p className="text-xs text-gray-500">
                              {faculty.designation ? `${faculty.designation}, ` : ''}
                              {faculty.department || 'Department'}
                            </p>
                          </div>
                          <span className="text-indigo-600 text-xs font-medium">Add</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Selected Preferences</p>
                  {selectedFaculty.length === 0 ? (
                    <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">
                      No faculty selected yet. Add your preferences from the list.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {selectedFaculty.map((entry) => (
                        <li
                          key={entry.faculty._id}
                          className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Priority {entry.priority}: {entry.faculty.fullName}
                            </p>
                            <p className="text-xs text-gray-500">{entry.faculty.department}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFacultyPreference(entry.faculty._id)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/student/mtech/sem3/major-project')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Submit Registration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default MTechSem3MajorProjectRegister;

