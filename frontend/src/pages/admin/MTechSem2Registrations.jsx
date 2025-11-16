import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const MTechSem2Registrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('current');

  useEffect(() => {
    loadRegistrations();
  }, []);

  useEffect(() => {
    applyFilter(selectedYear);
  }, [registrations, selectedYear]);

  const academicYears = useMemo(() => {
    const years = new Set(registrations.map((reg) => reg.academicYear).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [registrations]);

  const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const isPreJuly = now.getMonth() < 6;
    const startYear = isPreJuly ? year - 1 : year;
    return `${startYear}-${(startYear + 1).toString().slice(-2)}`;
  };

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getMTechSem2Registrations();
      setRegistrations(response.data || []);
    } catch (error) {
      console.error('Failed to load M.Tech Sem 2 registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (yearFilter) => {
    if (!registrations.length) {
      setFiltered([]);
      return;
    }

    let filteredData = registrations;
    if (yearFilter === 'current') {
      const currentYear = getCurrentAcademicYear();
      filteredData = registrations.filter((reg) => reg.academicYear === currentYear);
    } else if (yearFilter && yearFilter !== 'all') {
      filteredData = registrations.filter((reg) => reg.academicYear === yearFilter);
    }

    filteredData = filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setFiltered(filteredData);
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportCsv = () => {
    if (!filtered.length) return;
    const headers = [
      'Timestamp',
      'Email',
      'Student Name',
      'MIS Number',
      'Contact',
      'Branch',
      'Project Title',
      'Is Continuation',
      'Faculty Allocated',
      'Status',
      'Academic Year'
    ];
    const rows = filtered.map((reg) => [
      `"${formatDateTime(reg.timestamp)}"`,
      `"${reg.email || ''}"`,
      `"${reg.name || ''}"`,
      `"${reg.misNumber || ''}"`,
      `"${reg.contact || ''}"`,
      `"${reg.branch || ''}"`,
      `"${reg.projectTitle || ''}"`,
      `"${reg.isContinuation ? 'Yes' : 'No'}"`,
      `"${reg.facultyAllocated || 'Not Allocated'}"`,
      `"${reg.status || ''}"`,
      `"${reg.academicYear || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mtech_sem2_minor_project_registrations.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">M.Tech Sem 2 Minor Project Registrations</h1>
            <p className="mt-2 text-gray-600">
              Track registrations and allocations for the current M.Tech Semester 2 Minor Project 2 cycle.
            </p>
          </div>
          <Link
            to="/dashboard/admin"
            className="inline-flex items-center px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-800 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">Academic Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="current">Current Academic Year ({getCurrentAcademicYear()})</option>
                <option value="all">All Academic Years</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadRegistrations}
                className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition"
              >
                Refresh
              </button>
            </div>
            <div className="flex items-end justify-end">
              <button
                onClick={exportCsv}
                disabled={!filtered.length}
                className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
              >
                Export CSV
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Showing {filtered.length} of {registrations.length} registrations
            {selectedYear !== 'all' && ` for ${selectedYear === 'current' ? 'current academic year' : selectedYear}`}.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg p-4 shadow">
            <div className="text-sm uppercase tracking-wide opacity-80">Registered Projects</div>
            <div className="text-2xl font-semibold mt-2">{filtered.length}</div>
          </div>
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg p-4 shadow">
            <div className="text-sm uppercase tracking-wide opacity-80">Faculty Allocated</div>
            <div className="text-2xl font-semibold mt-2">
              {filtered.filter((reg) => reg.facultyAllocated && reg.facultyAllocated !== 'Not Allocated').length}
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg p-4 shadow">
            <div className="text-sm uppercase tracking-wide opacity-80">Pending Allocation</div>
            <div className="text-2xl font-semibold mt-2">
              {filtered.filter(
                (reg) => !reg.facultyAllocated || reg.facultyAllocated === 'Not Allocated'
              ).length}
            </div>
          </div>
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-lg p-4 shadow">
            <div className="text-sm uppercase tracking-wide opacity-80">Academic Years</div>
            <div className="text-2xl font-semibold mt-2">{academicYears.length}</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center items-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading registrations...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <h3 className="text-xl font-semibold text-gray-800">No registrations found</h3>
              <p className="mt-2 text-gray-500">
                {selectedYear === 'current'
                  ? 'No registrations for the current academic year yet.'
                  : 'Adjust filters or refresh to see registrations.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MIS Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Continuation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Faculty Allocated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Academic Year
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((registration, idx) => (
                    <tr key={registration._id || `${registration.misNumber}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(registration.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{registration.name || 'N/A'}</span>
                          <span className="text-xs text-gray-500">{registration.email || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.misNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.contact || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {registration.projectTitle || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            registration.isContinuation
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {registration.isContinuation ? 'Continued' : 'New'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            registration.facultyAllocated && registration.facultyAllocated !== 'Not Allocated'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {registration.facultyAllocated || 'Not Allocated'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.status || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.academicYear || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MTechSem2Registrations;

