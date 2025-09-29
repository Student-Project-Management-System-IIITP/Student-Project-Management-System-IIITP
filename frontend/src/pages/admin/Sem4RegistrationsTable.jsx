import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../utils/api';

const Sem4RegistrationsTable = () => {
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
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

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      
      // Load all registrations without filtering (backend will handle the basic filtering)
      const response = await adminAPI.getSem4Registrations();
      const allRegistrations = response.data || [];
      setRegistrations(allRegistrations);
      
      // Apply frontend batch sorting and filtering
      const sortedAndFiltered = sortRegistrationsByBatch(allRegistrations);
      setFilteredRegistrations(sortedAndFiltered);
    } catch (error) {
      console.error('Failed to load registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Re-apply filtering when settings change (but not re-load from API)
  useEffect(() => {
    if (registrations.length > 0) {
      const sortedAndFiltered = sortRegistrationsByBatch(registrations);
      setFilteredRegistrations(sortedAndFiltered);
    }
  }, [registrations, selectedBatch, currentYearOnly]);

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

  // Function to generate CSV content
  const generateCSV = (regs) => {
    const headers = ['Timestamp', 'Email Address', 'Name', 'MIS Number', 'Contact', 'Branch', 'Project Title'];
    const csvContent = [
      headers.join(','),
      ...regs.map(reg => [
        `"${formatTimestamp(reg.timestamp)}"`,
        `"${reg.email}"`,
        `"${reg.name}"`,
        `"${reg.misNumber}"`,
        `"${reg.contact}"`,
        `"${reg.branch}"`,
        `"${reg.projectTitle || ''}"`
      ].join(','))
    ].join('\n');
    
    return csvContent;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Minor Project 1 Registrations
              </h1>
              <p className="mt-2 text-gray-600">
                View all Sem 4 Minor Project 1 registrations with batch filtering
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
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                onClick={loadRegistrations}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
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

        {/* Export Button - Above Table */}
        {filteredRegistrations.length > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                // Export to CSV functionality
                const csvContent = generateCSV(filteredRegistrations);
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                if (link.download !== undefined) {
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', 'sem4_minor_project_1_registrations.csv');
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
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Total Registrations:</h3>
              <p className="text-blue-700">{filteredRegistrations.length} Minor Project 1 registrations</p>
            </div>
            <div>
              {currentYearOnly ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Current Year
                </span>
              ) : selectedBatch ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Batch {selectedBatch}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No registrations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {currentYearOnly ? 'No registrations for current year' : 
                 selectedBatch ? `No registrations for batch ${selectedBatch}` : 
                 'No registrations available'}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proposed Project Title/Area
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRegistrations.map((registration, index) => (
                    <tr key={registration._id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(registration.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.misNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.contact}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.branch}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {registration.projectTitle || 'N/A'}
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

export default Sem4RegistrationsTable;
