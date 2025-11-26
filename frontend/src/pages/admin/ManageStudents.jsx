import React, { useState, useEffect, useRef, useCallback } from 'react';
import { studentAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import { showError } from '../../utils/toast';
import StudentProfileCard from '../../components/admin/StudentProfileCard';

const ManageStudents = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState('semester_desc');
  const listContainerRef = useRef(null);

  const measurePageSize = useCallback(() => {
    if (!listContainerRef.current) return;
    const containerHeight = listContainerRef.current.clientHeight || 400;
    const rowHeight = 72;
    const calculated = Math.max(5, Math.floor(containerHeight / rowHeight));
    setPageSize(calculated);
  }, []);

  useEffect(() => {
    measurePageSize();
    window.addEventListener('resize', measurePageSize);
    return () => {
      window.removeEventListener('resize', measurePageSize);
    };
  }, [measurePageSize]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadStudents = useCallback(async () => {
    try {
      setListLoading(true);
      const response = await studentAPI.searchStudents(debouncedQuery, page, pageSize, sortOrder);
      const data = response.data || [];
      setStudents(data);
      setTotal(response.total || data.length || 0);
      setTotalPages(response.totalPages || 1);
      if (!selectedStudentId && data.length > 0) {
        setSelectedStudentId(data[0]._id);
      }
    } catch (error) {
      const message = handleApiError(error, false);
      showError(message || 'Failed to load students');
    } finally {
      setListLoading(false);
    }
  }, [debouncedQuery, page, pageSize, sortOrder, selectedStudentId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const loadStudentDetails = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      setProfileLoading(true);
      const response = await studentAPI.getStudentDetails(studentId);
      setProfileData(response.data || null);
    } catch (error) {
      const message = handleApiError(error, false);
      showError(message || 'Failed to load student details');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentDetails(selectedStudentId);
    }
  }, [selectedStudentId, loadStudentDetails]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleSortOrderChange = (e) => {
    setSortOrder(e.target.value);
    setPage(1);
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudentId(studentId);
  };

  const handleProfileUpdated = () => {
    if (selectedStudentId) {
      loadStudentDetails(selectedStudentId);
    }
    loadStudents();
  };

  const renderStudentRow = (student) => {
    const user = student.user || null;
    const isSelected = selectedStudentId === student._id;
    return (
      <li
        key={student._id}
        className={
          'py-2 cursor-pointer px-2 rounded transition-colors ' +
          (isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50')
        }
        onClick={() => handleSelectStudent(student._id)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{student.fullName || 'Unnamed Student'}</p>
            <p className="text-xs text-gray-500">{user?.email || 'No email'}</p>
            <p className="text-xs text-gray-500">{student.contactNumber || 'No phone'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{student.misNumber || 'No MIS'}</p>
            <p className="text-[11px] text-gray-400">
              {student.branch || '—'}
              {student.semester ? ` • Sem ${student.semester}` : ''}
            </p>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Student Profiles</h1>
          <p className="text-gray-600 text-sm mt-1">
            Search, view, and update student profiles, and review their groups, internships, and projects.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by name, email, MIS, phone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {listLoading
                    ? 'Searching...'
                    : total === 0
                    ? 'No students found'
                    : `${total} students found`}
                </span>
              </div>
            </div>
          </div>

          <div
            ref={listContainerRef}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-h-[480px] overflow-y-auto flex flex-col"
          >
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Student Results</h2>
            <div className="mb-3 flex items-center justify-between text-xs text-gray-600">
              <label className="mr-2">Sort by Semester</label>
              <select
                value={sortOrder}
                onChange={handleSortOrderChange}
                className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="semester_desc">High to Low</option>
                <option value="semester_asc">Low to High</option>
              </select>
            </div>
            {listLoading ? (
              <div className="py-6 text-sm text-gray-500">Loading...</div>
            ) : students.length === 0 ? (
              <div className="py-6 text-sm text-gray-500">No students found.</div>
            ) : (
              <ul className="divide-y divide-gray-100 flex-1">
                {students.map(renderStudentRow)}
              </ul>
            )}
            <div className="pt-3 mt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={page <= 1}
                className={
                  'px-3 py-1 rounded border text-xs font-medium ' +
                  (page <= 1
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50')
                }
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={page >= totalPages}
                className={
                  'px-3 py-1 rounded border text-xs font-medium ' +
                  (page >= totalPages
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50')
                }
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[320px]">
            {profileLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Loading profile...
              </div>
            ) : (
              <StudentProfileCard data={profileData} onUpdated={handleProfileUpdated} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageStudents;
