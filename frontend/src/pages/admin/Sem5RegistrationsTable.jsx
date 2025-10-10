import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../utils/api';

const Sem5RegistrationsTable = () => {
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [currentYearOnly, setCurrentYearOnly] = useState(true);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [maxSupervisors, setMaxSupervisors] = useState(7); // Track max supervisors in data

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
      
      const response = await adminAPI.getSem5Registrations();
      const allRegistrations = response.data || [];
      setRegistrations(allRegistrations);
      
      // Calculate maximum number of supervisors in the data
      let maxSups = 0;
      allRegistrations.forEach(reg => {
        for (let i = 1; i <= 10; i++) {
          if (reg[`supervisor${i}`]) {
            maxSups = Math.max(maxSups, i);
          }
        }
      });
      setMaxSupervisors(maxSups || 7); // Default to 7 if no data
      
      // Apply frontend batch sorting and filtering
      const sortedAndFiltered = sortRegistrationsByBatch(allRegistrations);
      setFilteredRegistrations(sortedAndFiltered);
    } catch (error) {
      console.error('Failed to load registrations:', error);
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
    const headers = [
      'Timestamp',
      'Email Address',
      'Name of Group Member 1',
      'MIS No. of Group Member 1',
      'Contact No. of Group Member 1',
      'Branch of Group Member 1',
      'Name of Group Member 2',
      'MIS No. of Group Member 2',
      'Contact No. of Group Member 2',
      'Branch of Group Member 2',
      'Name of Group Member 3',
      'MIS No. of Group Member 3',
      'Contact No. of Group Member 3',
      'Branch of Group Member 3',
      'Name of Group Member 4',
      'MIS No. of Group Member 4',
      'Contact No. of Group Member 4',
      'Branch of Group Member 4',
      'Name of Group Member 5 (If Any)',
      'MIS No. of Group Member 5 (If Any)',
      'Contact No. of Group Member 5 (If Any)',
      'Branch of Group Member 5 (If Any)',
      'Proposed Project Title/Area'
    ];
    
    // Add dynamic supervisor preference headers based on actual data
    for (let i = 1; i <= maxSupervisors; i++) {
      headers.push(`Supervisor Preference ${i}`);
    }
    
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
          `"${reg.projectTitle || ''}"`
        ];
        
        // Add dynamic supervisor columns
        for (let i = 1; i <= maxSupervisors; i++) {
          row.push(`"${reg[`supervisor${i}`] || ''}"`);
        }
        
        return row.join(',');
      })
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
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Minor Project 2 Registrations (Sem 5)
              </h1>
              <p className="mt-2 text-gray-600">
                View all Sem 5 Minor Project 2 group registrations with batch filtering
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

        {/* Export Button */}
        {filteredRegistrations.length > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                const csvContent = generateCSV(filteredRegistrations);
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                if (link.download !== undefined) {
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', 'sem5_minor_project_2_registrations.csv');
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
              <p className="text-blue-700">{filteredRegistrations.length} Minor Project 2 group registrations</p>
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
                    {/* Dynamic Supervisor Headers */}
                    {Array.from({ length: maxSupervisors }, (_, i) => (
                      <th key={`supervisor-header-${i + 1}`} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supervisor {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRegistrations.map((reg, index) => (
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
                      {/* Dynamic Supervisor Columns */}
                      {Array.from({ length: maxSupervisors }, (_, i) => (
                        <td key={`supervisor-${index}-${i + 1}`} className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {reg[`supervisor${i + 1}`] || '-'}
                        </td>
                      ))}
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

export default Sem5RegistrationsTable;

