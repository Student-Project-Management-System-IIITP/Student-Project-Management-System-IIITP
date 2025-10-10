import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../utils/api';

const Sem5AllocatedFaculty = () => {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [currentYearOnly, setCurrentYearOnly] = useState(true);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('allocated'); // allocated, unallocated, notregistered
  const [stats, setStats] = useState({
    totalGroups: 0,
    allocatedGroups: 0,
    unallocatedGroups: 0,
    allocationRate: 0
  });
  const [studentStats, setStudentStats] = useState({
    totalNotRegistered: 0,
    inGroup: 0,
    notInGroup: 0
  });

  // Function to calculate batch from registration date
  const calculateBatch = (registrationDate) => {
    if (!registrationDate) return null;
    
    const date = new Date(registrationDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    let academicStartYear;
    if (month >= 6) {
      academicStartYear = year;
    } else {
      academicStartYear = year - 1;
    }
    
    const batchEndYear = academicStartYear + 4;
    return `${academicStartYear}-${batchEndYear}`;
  };

  // Function to sort and filter groups
  const sortAndFilterGroups = (grps) => {
    // Add calculated batch to each group
    const groupsWithBatch = grps.map(grp => ({
      ...grp,
      calculatedBatch: calculateBatch(grp.createdAt)
    }));
    
    // Extract available batches
    const batchGroups = {};
    groupsWithBatch.forEach(grp => {
      const batch = grp.calculatedBatch;
      if (!batchGroups[batch]) batchGroups[batch] = [];
      batchGroups[batch].push(grp);
    });
    
    const batches = Object.keys(batchGroups).sort((a, b) => a.localeCompare(b));
    setAvailableBatches(batches);
    
    // Filter by batch/year
    let filtered;
    if (currentYearOnly) {
      const currentBatch = calculateBatch(new Date());
      filtered = groupsWithBatch.filter(grp => 
        grp.calculatedBatch === currentBatch
      );
    } else if (selectedBatch) {
      filtered = groupsWithBatch.filter(grp => 
        grp.calculatedBatch === selectedBatch
      );
    } else {
      filtered = groupsWithBatch;
    }

    // Filter by allocation status based on active tab
    if (activeTab === 'allocated') {
      filtered = filtered.filter(grp => grp.isAllocated);
    } else if (activeTab === 'unallocated') {
      filtered = filtered.filter(grp => !grp.isAllocated);
    }
    
    return filtered;
  };

  // Function to sort and filter students
  const sortAndFilterStudents = (studs) => {
    // Add calculated batch to each student
    const studentsWithBatch = studs.map(stud => ({
      ...stud,
      calculatedBatch: calculateBatch(new Date()) // Using current date as students don't have registration date
    }));
    
    // Filter by batch/year - students use their academicYear directly
    let filtered = studentsWithBatch;
    
    if (currentYearOnly) {
      const currentBatch = calculateBatch(new Date());
      // Match based on academic year pattern
      filtered = filtered.filter(stud => {
        if (!stud.academicYear) return false;
        // academicYear is like "2024-25", batch is like "2024-2028"
        const acYearStart = stud.academicYear.split('-')[0];
        const batchStart = currentBatch.split('-')[0];
        return acYearStart === batchStart;
      });
    } else if (selectedBatch) {
      const batchStart = selectedBatch.split('-')[0];
      filtered = filtered.filter(stud => {
        if (!stud.academicYear) return false;
        const acYearStart = stud.academicYear.split('-')[0];
        return acYearStart === batchStart;
      });
    }
    
    return filtered;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load groups data
      const groupsResponse = await adminAPI.getSem5AllocatedFaculty();
      const allGroups = groupsResponse.data || [];
      const statsData = groupsResponse.stats || {
        totalGroups: 0,
        allocatedGroups: 0,
        unallocatedGroups: 0,
        allocationRate: 0
      };
      
      setGroups(allGroups);
      setStats(statsData);
      
      const filteredGrps = sortAndFilterGroups(allGroups);
      setFilteredGroups(filteredGrps);

      // Load non-registered students data
      const studentsResponse = await adminAPI.getSem5NonRegisteredStudents();
      const allStudents = studentsResponse.data || [];
      const studentStatsData = studentsResponse.stats || {
        totalNotRegistered: 0,
        inGroup: 0,
        notInGroup: 0
      };
      
      setStudents(allStudents);
      setStudentStats(studentStatsData);
      
      const filteredStuds = sortAndFilterStudents(allStudents);
      setFilteredStudents(filteredStuds);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Re-apply filtering when settings change
  useEffect(() => {
    if (groups.length > 0) {
      const filtered = sortAndFilterGroups(groups);
      setFilteredGroups(filtered);
    }
    if (students.length > 0) {
      const filtered = sortAndFilterStudents(students);
      setFilteredStudents(filtered);
    }
  }, [groups, students, selectedBatch, currentYearOnly, activeTab]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Function to generate CSV content
  const generateCSV = (grps) => {
    const headers = [
      'Group Name',
      'Allocated Faculty',
      'Faculty Department',
      'Faculty Designation',
      'Project Title',
      'Member 1 Name',
      'Member 1 MIS',
      'Member 1 Contact',
      'Member 1 Branch',
      'Member 2 Name',
      'Member 2 MIS',
      'Member 2 Contact',
      'Member 2 Branch',
      'Member 3 Name',
      'Member 3 MIS',
      'Member 3 Contact',
      'Member 3 Branch',
      'Member 4 Name',
      'Member 4 MIS',
      'Member 4 Contact',
      'Member 4 Branch',
      'Member 5 Name',
      'Member 5 MIS',
      'Member 5 Contact',
      'Member 5 Branch',
      'Status',
      'Created Date'
    ];
    
    const csvContent = [
      headers.join(','),
      ...grps.map(grp => [
        `"${grp.groupName}"`,
        `"${grp.allocatedFaculty}"`,
        `"${grp.facultyDepartment}"`,
        `"${grp.facultyDesignation}"`,
        `"${grp.projectTitle}"`,
        `"${grp.member1Name || ''}"`,
        `"${grp.member1MIS || ''}"`,
        `"${grp.member1Contact || ''}"`,
        `"${grp.member1Branch || ''}"`,
        `"${grp.member2Name || ''}"`,
        `"${grp.member2MIS || ''}"`,
        `"${grp.member2Contact || ''}"`,
        `"${grp.member2Branch || ''}"`,
        `"${grp.member3Name || ''}"`,
        `"${grp.member3MIS || ''}"`,
        `"${grp.member3Contact || ''}"`,
        `"${grp.member3Branch || ''}"`,
        `"${grp.member4Name || ''}"`,
        `"${grp.member4MIS || ''}"`,
        `"${grp.member4Contact || ''}"`,
        `"${grp.member4Branch || ''}"`,
        `"${grp.member5Name || ''}"`,
        `"${grp.member5MIS || ''}"`,
        `"${grp.member5Contact || ''}"`,
        `"${grp.member5Branch || ''}"`,
        `"${grp.status}"`,
        `"${formatTimestamp(grp.createdAt)}"`
      ].join(','))
    ].join('\n');
    
    return csvContent;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Faculty Allocation Overview (Sem 5)
              </h1>
              <p className="mt-2 text-gray-600">
                View all groups with their allocated faculty and group member details
              </p>
            </div>
            <Link
              to="/dashboard/admin"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Groups</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
              </div>
              <div className="ml-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Allocated</p>
                <p className="text-2xl font-bold text-green-600">{stats.allocatedGroups}</p>
              </div>
              <div className="ml-4">
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Unallocated</p>
                <p className="text-2xl font-bold text-red-600">{stats.unallocatedGroups}</p>
              </div>
              <div className="ml-4">
                <div className="bg-red-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Allocation Rate</p>
                <p className="text-2xl font-bold text-blue-600">{stats.allocationRate}%</p>
              </div>
              <div className="ml-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('allocated')}
                className={`${
                  activeTab === 'allocated'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Allocated Groups ({stats.allocatedGroups})</span>
              </button>
              <button
                onClick={() => setActiveTab('unallocated')}
                className={`${
                  activeTab === 'unallocated'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pending Allocation ({stats.unallocatedGroups})</span>
              </button>
              <button
                onClick={() => setActiveTab('notregistered')}
                className={`${
                  activeTab === 'notregistered'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Not Registered ({studentStats.totalNotRegistered})</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show Current Year:
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={currentYearOnly}
                  onChange={(e) => {
                    setCurrentYearOnly(e.target.checked);
                    if (e.target.checked) setSelectedBatch('');
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Current Year Only</span>
              </div>
            </div>
            
            {!currentYearOnly && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Batch:
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Batches</option>
                  {availableBatches.map((batch) => (
                    <option key={batch} value={batch}>
                      Batch {batch}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-end">
              <button
                onClick={loadData}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Export Button */}
        {((activeTab !== 'notregistered' && filteredGroups.length > 0) || (activeTab === 'notregistered' && filteredStudents.length > 0)) && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                let csvContent;
                if (activeTab === 'notregistered') {
                  // Generate CSV for students
                  const headers = ['Name', 'MIS Number', 'Email', 'Contact', 'Branch', 'Group Status', 'Group Name'];
                  csvContent = [
                    headers.join(','),
                    ...filteredStudents.map(stud => [
                      `"${stud.fullName}"`,
                      `"${stud.misNumber}"`,
                      `"${stud.email}"`,
                      `"${stud.contactNumber}"`,
                      `"${stud.branch}"`,
                      `"${stud.groupStatus}"`,
                      `"${stud.groupName}"`
                    ].join(','))
                  ].join('\n');
                } else {
                  csvContent = generateCSV(filteredGroups);
                }
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                if (link.download !== undefined) {
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  const fileName = activeTab === 'notregistered' 
                    ? `sem5_not_registered_students.csv`
                    : `sem5_${activeTab}_groups.csv`;
                  link.setAttribute('download', fileName);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export to CSV</span>
            </button>
          </div>
        )}

        {/* Results Summary */}
        <div className={`mb-6 border rounded-lg p-4 ${
          activeTab === 'allocated' ? 'bg-green-50 border-green-200' : 
          activeTab === 'unallocated' ? 'bg-orange-50 border-orange-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-medium ${
                activeTab === 'allocated' ? 'text-green-900' : 
                activeTab === 'unallocated' ? 'text-orange-900' :
                'text-red-900'
              }`}>
                {activeTab === 'allocated' ? 'Allocated Groups:' : 
                 activeTab === 'unallocated' ? 'Pending Allocation:' :
                 'Not Registered Students:'}
              </h3>
              <p className={
                activeTab === 'allocated' ? 'text-green-700' : 
                activeTab === 'unallocated' ? 'text-orange-700' :
                'text-red-700'
              }>
                {activeTab === 'notregistered' 
                  ? `${filteredStudents.length} students` 
                  : `${filteredGroups.length} groups`
                }
              </p>
            </div>
            <div className="flex space-x-2">
              {currentYearOnly && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Current Year
                </span>
              )}
              {selectedBatch && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Batch {selectedBatch}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Groups/Students Table */}
        {activeTab === 'notregistered' ? (
          /* Students Table */
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                <p className="mt-1 text-sm text-gray-500">All students have registered</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MIS Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student, index) => (
                      <tr key={student._id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.fullName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.misNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.contactNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.branch}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.groupStatus === 'In Group' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.groupStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.groupName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Groups Table */
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No groups found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {currentYearOnly ? 'No groups for current year' : 
                 selectedBatch ? `No groups for batch ${selectedBatch}` : 
                 'No groups available'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={activeTab === 'allocated' ? 'bg-green-50' : 'bg-red-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10 ${
                      activeTab === 'allocated' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      Group Name
                    </th>
                    {activeTab === 'allocated' && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-100">
                          Allocated Faculty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Title
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member 1
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MIS 1
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact 1
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch 1
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member 2
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MIS 2
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact 2
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch 2
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member 3
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MIS 3
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact 3
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch 3
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member 4
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MIS 4
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact 4
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch 4
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member 5
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MIS 5
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact 5
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch 5
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGroups.map((grp, index) => (
                    <tr key={grp._id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {grp.groupName}
                      </td>
                      {activeTab === 'allocated' && (
                        <>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-700 bg-green-50">
                            {grp.allocatedFaculty}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {grp.facultyDepartment || '-'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {grp.projectTitle}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member1Name || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member1MIS || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member1Contact || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member1Branch || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member2Name || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member2MIS || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member2Contact || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member2Branch || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member3Name || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member3MIS || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member3Contact || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member3Branch || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member4Name || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member4MIS || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member4Contact || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member4Branch || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member5Name || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member5MIS || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member5Contact || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {grp.member5Branch || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          grp.status === 'finalized' ? 'bg-green-100 text-green-800' :
                          grp.status === 'locked' ? 'bg-blue-100 text-blue-800' :
                          grp.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {grp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

      </div>
    </div>
  );
};

export default Sem5AllocatedFaculty;

