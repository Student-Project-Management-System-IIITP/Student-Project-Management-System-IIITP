import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import Layout from '../../components/common/Layout';
import toast from 'react-hot-toast';

const Sem4UnregisteredStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnregisteredStudents();
  }, []);

  const loadUnregisteredStudents = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUnregisteredSem4Students();
      setStudents(response.data || []);
    } catch (error) {
      toast.error('Failed to load unregistered students');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading unregistered students...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Unregistered Semester 4 Students</h1>
          <p className="text-gray-600 mt-2">
            Students who have not yet registered for Minor Project 1
          </p>
        </div>

        {/* Statistics Card */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{students.length}</h2>
              <p className="text-orange-100 mt-1">
                {students.length === 0 
                  ? 'All students have registered!' 
                  : `Student${students.length !== 1 ? 's' : ''} pending registration`
                }
              </p>
            </div>
            <div className="text-5xl opacity-50">
              📋
            </div>
          </div>
        </div>

        {/* Content */}
        {students.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              All Students Registered!
            </h3>
            <p className="text-gray-600">
              All Semester 4 students have successfully registered for Minor Project 1.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Student List ({students.length})
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      S.No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name of the Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MIS Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.collegeEmail || student.user?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.misNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.contactNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.branch}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sem4UnregisteredStudents;

