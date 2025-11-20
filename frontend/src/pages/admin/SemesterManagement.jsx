import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';

const SemesterManagement = () => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  
  // Form state
  const [fromSemester, setFromSemester] = useState(5);
  const [toSemester, setToSemester] = useState(6);
  const [degree, setDegree] = useState('B.Tech');
  const [validatePrerequisites, setValidatePrerequisites] = useState(true);
  
  // Results state
  const [validationResults, setValidationResults] = useState(null);
  const [updateResults, setUpdateResults] = useState(null);

  // Load students when fromSemester or degree changes
  useEffect(() => {
    if (fromSemester) {
      loadStudents();
    }
  }, [fromSemester, degree]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStudentsBySemester({ semester: fromSemester, degree });
      
      if (response.success) {
        setStudents(response.data);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error(error.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(students.map(s => s._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleValidate = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      setLoading(true);
      setValidationResults(null);
      
      const response = await adminAPI.updateStudentSemesters({
        fromSemester,
        toSemester,
        studentIds: selectedStudents,
        degree,
        validatePrerequisites: true
      });

      if (response.success) {
        setValidationResults(response);
        
        if (response.ineligibleCount > 0) {
          toast.warning(`${response.eligibleCount} eligible, ${response.ineligibleCount} ineligible`);
        } else {
          toast.success(`All ${response.eligibleCount} students are eligible!`);
        }
      }
    } catch (error) {
      console.error('Error validating students:', error);
      toast.error(error.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!window.confirm(`Are you sure you want to update ${selectedStudents.length} students from Semester ${fromSemester} to Semester ${toSemester}?`)) {
      return;
    }

    try {
      setLoading(true);
      setUpdateResults(null);
      
      const response = await adminAPI.updateStudentSemesters({
        fromSemester,
        toSemester,
        studentIds: selectedStudents,
        degree,
        validatePrerequisites
      });

      if (response.success) {
        // Check if this is a validation-only response (no actual update happened)
        if (response.validated && response.ineligibleCount > 0 && !response.data?.totalUpdated) {
          setValidationResults(response);
          toast.error(`${response.ineligibleCount} student(s) are ineligible. Check validation results below.`);
          return;
        }
        
        setUpdateResults(response);
        toast.success(response.message);
        
        // Clear selections and validation
        setSelectedStudents([]);
        setValidationResults(null);
        
        // Wait a moment to ensure DB is updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload students list
        await loadStudents();
      }
    } catch (error) {
      console.error('Error updating students:', error);
      toast.error(error.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Semester Management</h1>
          <p className="text-gray-600 mt-2">Update student semesters for testing or semester progression</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Semester
              </label>
              <select
                value={fromSemester}
                onChange={(e) => setFromSemester(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Semester
              </label>
              <select
                value={toSemester}
                onChange={(e) => setToSemester(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Degree
              </label>
              <select
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="B.Tech">B.Tech</option>
                <option value="M.Tech">M.Tech</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={validatePrerequisites}
                  onChange={(e) => setValidatePrerequisites(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Validate Prerequisites</span>
              </label>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={loadStudents}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              Refresh List
            </button>
            <button
              onClick={handleValidate}
              disabled={loading || selectedStudents.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Validate Selected ({selectedStudents.length})
            </button>
            <button
              onClick={handleUpdate}
              disabled={loading || selectedStudents.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Update to Semester {toSemester}
            </button>
          </div>
        </div>

        {/* Validation Results */}
        {validationResults && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Validation Results</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600">Total Students</div>
                <div className="text-2xl font-bold text-blue-900">{validationResults.totalStudents}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600">Eligible</div>
                <div className="text-2xl font-bold text-green-900">{validationResults.eligibleCount}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-red-600">Ineligible</div>
                <div className="text-2xl font-bold text-red-900">{validationResults.ineligibleCount}</div>
              </div>
            </div>

            {validationResults.ineligibleStudents?.length > 0 && (
              <div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        <strong>These students were NOT updated.</strong> To proceed, either fix the prerequisites or disable "Validate Prerequisites" to force update.
                      </p>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-3">Ineligible Students</h3>
                <div className="space-y-2">
                  {validationResults.ineligibleStudents.map((student, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{student.fullName}</p>
                          <p className="text-sm text-gray-600">{student.misNumber} • {student.email}</p>
                        </div>
                        <div className="text-right">
                          <ul className="text-sm text-red-600 space-y-1">
                            {student.issues.map((issue, i) => (
                              <li key={i}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Update Results */}
        {updateResults && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-green-900 mb-2">Update Successful!</h2>
            <p className="text-green-700 mb-4">{updateResults.message}</p>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <span className="text-sm text-green-600">Matched:</span>
                <span className="ml-2 font-bold text-green-900">{updateResults.data?.matchedCount}</span>
              </div>
              <div>
                <span className="text-sm text-green-600">Updated:</span>
                <span className="ml-2 font-bold text-green-900">{updateResults.data?.totalUpdated}</span>
              </div>
              <div>
                <span className="text-sm text-green-600">From Sem {updateResults.data?.fromSemester} → Sem {updateResults.data?.toSemester}</span>
              </div>
            </div>
            
            {updateResults.data?.updatedStudents && updateResults.data.updatedStudents.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">Updated Students:</h3>
                <div className="bg-white rounded p-3 max-h-40 overflow-y-auto">
                  <ul className="text-sm text-gray-700 space-y-1">
                    {updateResults.data.updatedStudents.map((student, index) => (
                      <li key={index}>
                        {student.fullName} ({student.misNumber}) - Now in Semester {student.semester}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Students List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Students in Semester {fromSemester} ({students.length})
            </h2>
            {students.length > 0 && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === students.length && students.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Select All</span>
              </label>
            )}
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading students...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No students found in Semester {fromSemester}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      MIS Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Faculty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Project
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => handleSelectStudent(student._id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.misNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {student.branch}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.hasGroup ? (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            student.groupStatus === 'finalized' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {student.groupStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No group</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {student.hasFaculty ? (
                          <span className="text-green-600">✓ {student.facultyName}</span>
                        ) : (
                          <span className="text-red-600">✗ Not allocated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.hasProject ? (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            student.projectStatus === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {student.projectStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No project</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important Notes</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>This action updates student semester data in the database</li>
                  <li>Enable "Validate Prerequisites" to check if students have required data (group, project, faculty)</li>
                  <li><strong>For Sem 5 → Sem 6:</strong> Students must have a finalized group, registered project, and allocated faculty</li>
                  <li><strong>For Sem 7 → Sem 8:</strong> 
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li><strong>Coursework track (Type 2):</strong> Must have finalized group, registered Major Project 1, and allocated faculty</li>
                      <li><strong>Internship track (Type 1):</strong> Must have verified 6-month internship (status: verified_pass) and internship outcome set to verified_pass</li>
                    </ul>
                  </li>
                  <li>Students will need to register for their new semester's project after the update</li>
                  <li>Type 1 students (6-month internship in Sem 7) will be auto-enrolled in coursework for Sem 8</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SemesterManagement;

