import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../utils/api';

const Sem6RegistrationsTable = () => {
  const [activeTab, setActiveTab] = useState('registered'); // 'registered' or 'non-registered'
  
  // Registered groups state
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  
  // Non-registered groups state
  const [nonRegisteredGroups, setNonRegisteredGroups] = useState([]);
  const [filteredNonRegistered, setFilteredNonRegistered] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [currentYearOnly, setCurrentYearOnly] = useState(true);
  const [availableBatches, setAvailableBatches] = useState([]);

  // Function to calculate batch from registration date
  const calculateBatch = (registrationDate) => {
    if (!registrationDate) return null;
    
    const date = new Date(registrationDate);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    
    // Assuming academic year starts in July (month 6)
    let academicStartYear;
    if (month >= 6) { // July to December
      academicStartYear = year;
    } else { // January to June
      academicStartYear = year - 1;
    }
    
    const batchEndYear = academicStartYear + 4;
    return `${academicStartYear}-${batchEndYear}`;
  };

  // Function to sort registrations by batch
  const sortRegistrationsByBatch = (regs) => {
    // Add calculated batch to each registration
    const registrationsWithBatch = regs.map(reg => ({
      ...reg,
      calculatedBatch: calculateBatch(reg.timestamp)
    }));
    
    // Group by batch and sort batches
    const batchGroups = {};
    registrationsWithBatch.forEach(reg => {
      const batch = reg.calculatedBatch;
      if (!batchGroups[batch]) batchGroups[batch] = [];
      batchGroups[batch].push(reg);
    });
    
    // Extract available batches and sort them
    const batches = Object.keys(batchGroups).sort((a, b) => a.localeCompare(b));
    setAvailableBatches(batches);
    
    // Return filtered data based on selection
    let filtered;
    if (currentYearOnly) {
      const currentBatch = calculateBatch(new Date());
      filtered = registrationsWithBatch.filter(reg => 
        reg.calculatedBatch === currentBatch
      );
    } else if (selectedBatch) {
      filtered = registrationsWithBatch.filter(reg => 
        reg.calculatedBatch === selectedBatch
      );
    } else {
      filtered = registrationsWithBatch;
    }
    
    // Sort within each batch by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return filtered;
  };

  // Function to sort non-registered groups
  const sortNonRegisteredByBatch = (groups) => {
    const groupsWithBatch = groups.map(group => ({
      ...group,
      calculatedBatch: calculateBatch(group.createdAt)
    }));
    
    let filtered;
    if (currentYearOnly) {
      const currentBatch = calculateBatch(new Date());
      filtered = groupsWithBatch.filter(group => 
        group.calculatedBatch === currentBatch
      );
    } else if (selectedBatch) {
      filtered = groupsWithBatch.filter(group => 
        group.calculatedBatch === selectedBatch
      );
    } else {
      filtered = groupsWithBatch;
    }
    
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return filtered;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load registered groups
      const registrationsResponse = await adminAPI.getSem6Registrations();
      const allRegistrations = registrationsResponse.data || [];
      setRegistrations(allRegistrations);
      
      const sortedAndFiltered = sortRegistrationsByBatch(allRegistrations);
      setFilteredRegistrations(sortedAndFiltered);

      // Load non-registered groups
      const nonRegisteredResponse = await adminAPI.getSem6NonRegisteredGroups();
      const allNonRegistered = nonRegisteredResponse.data || [];
      setNonRegisteredGroups(allNonRegistered);
      
      const sortedNonRegistered = sortNonRegisteredByBatch(allNonRegistered);
      setFilteredNonRegistered(sortedNonRegistered);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Re-apply filtering when settings change
  useEffect(() => {
    if (registrations.length > 0) {
      const sortedAndFiltered = sortRegistrationsByBatch(registrations);
      setFilteredRegistrations(sortedAndFiltered);
    }
    if (nonRegisteredGroups.length > 0) {
      const sortedNonRegistered = sortNonRegisteredByBatch(nonRegisteredGroups);
      setFilteredNonRegistered(sortedNonRegistered);
    }
  }, [registrations, nonRegisteredGroups, selectedBatch, currentYearOnly]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Function to generate CSV content for registered groups
  const generateRegisteredCSV = (regs) => {
    const headers = [
      'Timestamp',
      'Email',
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
      'Project Title',
      'Allocated Faculty',
      'Faculty Department',
      'Faculty Designation'
    ];
    
    const csvContent = [
      headers.join(','),
      ...regs.map(reg => {
        const row = [
          `"${formatTimestamp(reg.timestamp)}"`,
          `"${reg.email}"`,
          `"${reg.member1Name || ''}"`,
          `"${reg.member1MIS || ''}"`,
          `"${reg.member1Contact || ''}"`,
          `"${reg.member1Branch || ''}"`,
          `"${reg.member2Name || ''}"`,
          `"${reg.member2MIS || ''}"`,
          `"${reg.member2Contact || ''}"`,
          `"${reg.member2Branch || ''}"`,
          `"${reg.member3Name || ''}"`,
          `"${reg.member3MIS || ''}"`,
          `"${reg.member3Contact || ''}"`,
          `"${reg.member3Branch || ''}"`,
          `"${reg.member4Name || ''}"`,
          `"${reg.member4MIS || ''}"`,
          `"${reg.member4Contact || ''}"`,
          `"${reg.member4Branch || ''}"`,
          `"${reg.member5Name || ''}"`,
          `"${reg.member5MIS || ''}"`,
          `"${reg.member5Contact || ''}"`,
          `"${reg.member5Branch || ''}"`,
          `"${reg.projectTitle || ''}"`,
          `"${reg.allocatedFaculty || ''}"`,
          `"${reg.facultyDepartment || ''}"`,
          `"${reg.facultyDesignation || ''}"`
        ];
        
        return row.join(',');
      })
    ].join('\n');
    
    return csvContent;
  };

  // Function to generate CSV content for non-registered groups
  const generateNonRegisteredCSV = (groups) => {
    const headers = [
      'Group Name',
      'Leader Name',
      'Leader MIS',
      'Allocated Faculty',
      'Member 1 Name',
      'Member 1 MIS',
      'Member 1 Contact',
      'Member 1 Branch',
      'Member 1 Email',
      'Member 2 Name',
      'Member 2 MIS',
      'Member 2 Contact',
      'Member 2 Branch',
      'Member 2 Email',
      'Member 3 Name',
      'Member 3 MIS',
      'Member 3 Contact',
      'Member 3 Branch',
      'Member 3 Email',
      'Member 4 Name',
      'Member 4 MIS',
      'Member 4 Contact',
      'Member 4 Branch',
      'Member 4 Email',
      'Member 5 Name',
      'Member 5 MIS',
      'Member 5 Contact',
      'Member 5 Branch',
      'Member 5 Email'
    ];
    
    const csvContent = [
      headers.join(','),
      ...groups.map(group => [
        `"${group.groupName || ''}"`,
        `"${group.leaderName || ''}"`,
        `"${group.leaderMIS || ''}"`,
        `"${group.allocatedFaculty || ''}"`,
        `"${group.member1Name || ''}"`,
        `"${group.member1MIS || ''}"`,
        `"${group.member1Contact || ''}"`,
        `"${group.member1Branch || ''}"`,
        `"${group.member1Email || ''}"`,
        `"${group.member2Name || ''}"`,
        `"${group.member2MIS || ''}"`,
        `"${group.member2Contact || ''}"`,
        `"${group.member2Branch || ''}"`,
        `"${group.member2Email || ''}"`,
        `"${group.member3Name || ''}"`,
        `"${group.member3MIS || ''}"`,
        `"${group.member3Contact || ''}"`,
        `"${group.member3Branch || ''}"`,
        `"${group.member3Email || ''}"`,
        `"${group.member4Name || ''}"`,
        `"${group.member4MIS || ''}"`,
        `"${group.member4Contact || ''}"`,
        `"${group.member4Branch || ''}"`,
        `"${group.member4Email || ''}"`,
        `"${group.member5Name || ''}"`,
        `"${group.member5MIS || ''}"`,
        `"${group.member5Contact || ''}"`,
        `"${group.member5Branch || ''}"`,
        `"${group.member5Email || ''}"`
      ].join(','))
    ].join('\n');
    
    return csvContent;
  };

  const handleExport = () => {
    let csvContent;
    let filename;
    
    if (activeTab === 'registered') {
      csvContent = generateRegisteredCSV(filteredRegistrations);
      filename = 'sem6_registered_groups.csv';
    } else {
      csvContent = generateNonRegisteredCSV(filteredNonRegistered);
      filename = 'sem6_non_registered_groups.csv';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentData = activeTab === 'registered' ? filteredRegistrations : filteredNonRegistered;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Major Project Registrations (Sem 6)
              </h1>
              <p className="mt-2 text-gray-600">
                View Sem 6 Major Project registrations and track group registration status
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

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('registered')}
              className={`${
                activeTab === 'registered'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Registered Groups ({filteredRegistrations.length})
            </button>
            <button
              onClick={() => setActiveTab('non-registered')}
              className={`${
                activeTab === 'non-registered'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Not Registered ({filteredNonRegistered.length})
            </button>
          </nav>
        </div>

        {/* Batch Filter Controls */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show Current Year Records:
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={currentYearOnly}
                  onChange={(e) => {
                    setCurrentYearOnly(e.target.checked);
                    if (e.target.checked) setSelectedBatch('');
                  }}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Batch</option>
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
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <span>Filter applied: </span>
            {currentYearOnly ? (
              <span className="font-medium">Current Academic Year</span>
            ) : selectedBatch ? (
              <span className="font-medium">Batch {selectedBatch}</span>
            ) : (
              <span className="font-medium">All Records</span>
            )}
          </div>
        </div>

        {/* Export Button */}
        {currentData.length > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleExport}
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
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-green-900">
                {activeTab === 'registered' ? 'Registered Groups:' : 'Not Registered:'}
              </h3>
              <p className="text-green-700">
                {currentData.length} {activeTab === 'registered' ? 'major project' : 'Sem 5'} groups
              </p>
            </div>
            <div>
              {currentYearOnly ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Current Year
                </span>
              ) : selectedBatch ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Batch {selectedBatch}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {currentData.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No data found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {currentYearOnly ? 'No records for current year' : 
                 selectedBatch ? `No records for batch ${selectedBatch}` : 
                 'No records available'}
              </p>
            </div>
          ) : activeTab === 'registered' ? (
            <RegisteredGroupsTable 
              registrations={filteredRegistrations} 
              formatTimestamp={formatTimestamp}
            />
          ) : (
            <NonRegisteredGroupsTable 
              groups={filteredNonRegistered}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Registered Groups Table Component
const RegisteredGroupsTable = ({ registrations, formatTimestamp }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
            Timestamp
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Email
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 1 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 1 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 1 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 1 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 2 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 2 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 2 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 2 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 3 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 3 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 3 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 3 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 4 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 4 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 4 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 4 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 5 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 5 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 5 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 5 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Project Title
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Allocated Faculty
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Faculty Department
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Faculty Designation
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {registrations.map((reg, index) => (
          <tr key={reg._id || index} className="hover:bg-gray-50">
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white">
              {formatTimestamp(reg.timestamp)}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.email}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member1Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member1MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member1Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member1Branch || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member2Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member2MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member2Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member2Branch || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member3Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member3MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member3Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member3Branch || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member4Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member4MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member4Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member4Branch || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member5Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member5MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member5Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.member5Branch || '-'}
            </td>
            <td className="px-3 py-4 text-sm text-gray-900 max-w-xs truncate">
              {reg.projectTitle || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.allocatedFaculty || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.facultyDepartment || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {reg.facultyDesignation || '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Non-Registered Groups Table Component
const NonRegisteredGroupsTable = ({ groups }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Group Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Leader Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Leader MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Allocated Faculty
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 1 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 1 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 1 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 1 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 1 Email
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 2 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 2 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 2 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 2 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 2 Email
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 3 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 3 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 3 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 3 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 3 Email
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 4 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 4 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 4 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 4 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 4 Email
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 5 Name
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 5 MIS
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 5 Contact
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 5 Branch
          </th>
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Member 5 Email
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {groups.map((group, index) => (
          <tr key={group._id || index} className="hover:bg-gray-50">
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.groupName || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.leaderName || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.leaderMIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.allocatedFaculty || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member1Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member1MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member1Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member1Branch || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member1Email || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member2Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member2MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member2Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member2Branch || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member2Email || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member3Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member3MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member3Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member3Branch || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member3Email || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member4Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member4MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member4Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member4Branch || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member4Email || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member5Name || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member5MIS || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member5Contact || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member5Branch || '-'}
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
              {group.member5Email || '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Sem6RegistrationsTable;

