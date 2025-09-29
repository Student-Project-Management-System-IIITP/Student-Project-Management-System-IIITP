import React, { useState, useEffect, useCallback, useRef } from 'react';
import { studentAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const StudentSearch = ({ 
  onSelection = () => {}, 
  multiple = false, 
  selectedStudents = [], 
  maxSelections = null,
  showLeadershipOptions = false,
  groupId = null,
  showAdvancedFilters = true,
  showInviteStatus = true,
  placeholder = "Search students by name, roll number, or email...",
  debounceDelay = 300
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'roll', 'branch', 'semester'
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced search state
  const [searchingAsync, setSearchingAsync] = useState(false);
  const [lastSearch, setLastSearch] = useState('');
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    loadStudents();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced debounced search functionality
  useEffect(() => {
    if (searchTerm !== lastSearch && searchTerm.length >= 2) {
      setSearchingAsync(true);
      
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, debounceDelay);
    } else if (searchTerm.length < 2) {
      setSearchingAsync(false);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, lastSearch, debounceDelay]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getAvailableStudents({
        limit: 50 // Get initial batch
      });
      if (response.success) {
        setStudents(response.data || []);
        const metadata = response.metadata || {};
        if (metadata.filters) {
          // Use metadata to dynamically update filter options
          console.log('Available filters from server:', metadata.filters);
        }
      } else {
        toast.error(response.message || 'Failed to load students');
      }
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced search function with server integration
  const performSearch = async () => {
    if (searchTerm.length < 2) return;
    
    try {
      setSearchingAsync(true);
      
      // Server-side search optimization
      const searchResponse = await studentAPI.getAvailableStudents({
        search: searchTerm,
        query: searchTerm,
        branch: filterBranch !== 'all' ? filterBranch : '',
        semester: filterSemester !== 'all' ? filterSemester : '',
        sortBy: sortBy,
        limit: 20
      });
      
      if (searchResponse.success) {
        const searchResults = searchResponse.data || [];
        const metadata = searchResponse.metadata || {};
        
        setStudents(prev => {
          // Merge with existing results for better UX
          const uniqueResults = [...searchResults];
          prev.forEach(student => {
            if (!uniqueResults.some(s => s._id === student._id)) {
              uniqueResults.push(student);
            }
          });
          return uniqueResults;
        });
        
        // Store metadata for advanced filters if supported
        if (metadata.filters) {
          // Could be used to dynamically populate filter options
          console.log('Available filters:', metadata.filters);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchingAsync(false);
      setLastSearch(searchTerm);
    }
  };

  // Enhanced filtering with multiple criteria
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm.length < 2 || (
      student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.collegeEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.misNumber?.includes(searchTerm)
    );
    
    const matchesBranch = filterBranch === 'all' || 
      (!student.branchCode || student.branchCode === filterBranch);
    
    const matchesSemester = filterSemester === 'all' || 
      (!student.semester || student.semester === parseInt(filterSemester));
    
    return matchesSearch && matchesBranch && matchesSemester;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.fullName || '').localeCompare(b.fullName || '');
      case 'roll':
        return (a.rollNumber || '').localeCompare(b.rollNumber || '');
      case 'branch':
        return (a.branchCode || '').localeCompare(b.branchCode || '');
      case 'semester':
        return (a.semester || 0) - (b.semester || 0);
      default:
        return 0;
    }
  });

  const handleStudentClick = (student) => {
    if (multiple) {
      const isSelected = selectedStudents.some(s => s._id === student._id);
      if (isSelected) {
        onSelection(selectedStudents.filter(s => s._id !== student._id));
      } else {
        if (!maxSelections || selectedStudents.length < maxSelections) {
          onSelection([...selectedStudents, student]);
        }
      }
    } else {
      onSelection([student]);
    }
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => 
        prev < filteredStudents.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => 
        prev > 0 ? prev - 1 : filteredStudents.length - 1
      );
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filteredStudents.length) {
      e.preventDefault();
      handleStudentClick(filteredStudents[focusedIndex]);
    } else if (e.key === 'Escape') {
      setSearchTerm('');
      setFocusedIndex(-1);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setSearching(value.length > 0);
    setFocusedIndex(-1);
  };

  const getSelectedStudentCount = () => multiple ? selectedStudents.length : (selectedStudents.length > 0 ? 1 : 0);

  // Advanced search helpers
  const getAvailableBranches = () => {
    const branches = [...new Set(students.map(s => s.branchCode).filter(Boolean))];
    return branches.sort();
  };

  const getAvailableSemesters = () => {
    const semesters = [...new Set(students.map(s => s.semester).filter(Boolean))];
    return semesters.sort();
  };

  const getInviteStatus = (student) => {
    // This would be enhanced with real invite status checking
    if (groupId && student.inviteHistory) {
      return student.inviteHistory.find(inv => inv.groupId === groupId)?.status || 'never';
    }
    return 'unknown';
  };

  const getStudentStatusBadge = (student) => {
    const status = getInviteStatus(student);
    
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">📧 Pending</span>;
      case 'accepted':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✅ In Group</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">❌ Declined</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">👀 Available</span>;
    }
  };

  // Focus management with auto-clear
  useEffect(() => {
    if (searching && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searching]);

  return (
    <div className="space-y-4">
      {/* Enhanced Search Input with Status */}
      <div className="relative">
        <div className="flex">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`flex-1 px-4 py-3 border rounded-l-lg focus:outline-none focus:ring-2 focus:border-blue-500 ${
              searching ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
          />
          
          {/* Search Controls */}
          <div className="flex border border-l-0 border-gray-300 rounded-r-lg">
            {showAdvancedFilters && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-3 text-gray-600 hover:text-gray-800 border-r border-gray-300 transition-colors"
                title="Advanced filters"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
              </button>
            )}
            
            {searchingAsync && (
              <div className="flex items-center px-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>
        
        {/* Search Results Count & Status */}
        {searching && (
          <div className="absolute right-2 top-2 flex items-center space-x-2 text-sm text-gray-500">
            {searchingAsync && (
              <div className="animate-pulse">🔍 Searching...</div>
            )}
            {!searchingAsync && (
              <div className="flex items-center space-x-1">
                <span>{filteredStudents.length} results</span>
                {filteredStudents.length > 0 && (
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Branch Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Branches</option>
                {getAvailableBranches().map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Semesters</option>
                {getAvailableSemesters().map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="roll">Roll Number</option>
                <option value="branch">Branch</option>
                <option value="semester">Semester</option>
              </select>
            </div>
          </div>

          {/* Filter Status */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filterBranch !== 'all' || filterSemester !== 'all' ? 'Filters active' : 'No filters applied'}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setFilterBranch('all');
                  setFilterSemester('all');
                }}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Indicator */}
      {multiple && maxSelections && (
        <div className="text-sm text-gray-600">
          Selected: {getSelectedStudentCount()}/{maxSelections} members
        </div>
      )}

      {/* Enhanced Live Search Results Dropdown */}
      {searching && (
        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-medium">No students found</p>
              <p className="text-sm mt-1">Try adjusting your search criteria or filters</p>
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs text-gray-600">
                {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'} found
                {searchTerm && <span> • Searching for "{searchTerm}"</span>}
              </div>
              
              {/* Student Results */}
              <div className="divide-y divide-gray-100">
                {filteredStudents.map((student, index) => {
                  const isSelected = selectedStudents.some(s => s._id === student._id);
                  const isMaxSelected = multiple && maxSelections && selectedStudents.length >= maxSelections;
                  const inviteStatus = getInviteStatus(student);
                  
                  return (
                    <button
                      key={student._id}
                      onClick={() => !isMaxSelected && handleStudentClick(student)}
                      disabled={isMaxSelected && !isSelected}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        focusedIndex === index ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      } ${isSelected ? 'bg-green-50' : ''} ${
                        inviteStatus === 'accepted' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Avatar with Status */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'bg-green-200 text-green-800' 
                              : inviteStatus === 'accepted'
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            <span className="text-lg">
                              {isSelected ? '✓' : 
                               inviteStatus === 'accepted' ? '👥' : '👤'}
                            </span>
                          </div>
                          
                          {inviteStatus !== 'unknown' && showInviteStatus && (
                            <div className="absolute -bottom-1 -right-1">
                              {getStudentStatusBadge(student)}
                            </div>
                          )}
                        </div>

                        {/* Student Information */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className={`font-medium text-lg ${
                                isSelected ? 'text-green-700' : 
                                inviteStatus === 'accepted' ? 'text-blue-700' : 'text-gray-900'
                              }`}>
                                {student.fullName}
                                {isSelected && <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Selected</span>}
                              </div>
                              
                              <div className="text-sm text-gray-600 mt-1 space-y-1">
                                <div className="flex items-center space-x-4">
                                  <span className="font-medium">{student.rollNumber}</span>
                                  {student.semester && <span>Sem {student.semester}</span>}
                                  {student.branchCode && <span>• {student.branchCode}</span>}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {student.collegeEmail}
                                </div>
                              </div>
                            </div>

                            {/* Action Indicators */}
                            <div className="flex flex-col items-end space-y-2">
                              {isMaxSelected && !isSelected && (
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                  Max reached
                                </span>
                              )}
                              
                              {multiple && maxSelections && (
                                <span className="text-xs text-gray-500">
                                  {selectedStudents.length}/{maxSelections} selected
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Additional Info Row */}
                          {inviteStatus !== 'unknown' && (
                            <div className="mt-2 flex items-center space-x-2 text-xs">
                              {showInviteStatus && getStudentStatusBadge(student)}
                              {student.branchCode && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                  {student.branchCode}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Results Footer */}
              {filteredStudents.length > 20 && (
                <div className="bg-gray-50 px-4 py-3 text-center text-xs text-gray-500 border-t border-gray-200">
                  Showing first 20 results. Refine your search for better accuracy.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Enhanced Selected Students Display */}
      {multiple && selectedStudents.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-green-900 flex items-center space-x-2">
              <span>👥</span>
              <span>Selected Students ({selectedStudents.length})</span>
              {maxSelections && (
                <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                  {selectedStudents.length}/{maxSelections}
                </span>
              )}
            </h4>
            {selectedStudents.length > 0 && (
              <button
                onClick={() => onSelection([])}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
                title="Clear all selections"
              >
                🗑️ Clear All
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {selectedStudents.map((student, index) => (
              <div key={student._id} className="group bg-white rounded-lg border border-green-200 hover:shadow-md transition-all p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-green-200 text-green-800 rounded-full flex items-center justify-center">
                      <span className="font-semibold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{student.fullName}</div>
                      <div className="text-sm text-gray-600 flex items-center space-x-4 mt-1">
                        <span>{student.rollNumber}</span>
                        {student.semester && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            Sem {student.semester}
                          </span>
                        )}
                        {student.branchCode && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {student.branchCode}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        {student.collegeEmail}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onSelection(selectedStudents.filter(s => s._id !== student._id))}
                    className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 transition-all duration-200 p-2 hover:bg-red-50 rounded-lg"
                    title="Remove student"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Hints */}
          {maxSelections && selectedStudents.length < maxSelections && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700">
                <span className="font-medium">💡 </span>
                You can select {maxSelections - selectedStudents.length} more students
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 font-medium">Loading students...</p>
          <p className="text-sm text-gray-500 mt-1">Fetching available students for your semester</p>
        </div>
      )}

      {/* Search Enhancement Tips */}
      {!searching && !loading && students.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 text-lg">💡</div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 text-sm">Search Tips</h4>
              <div className="text-xs text-blue-700 mt-1 space-y-1">
                <p>• Use <span className="font-mono bg-blue-100 px-1 rounded">Advanced Filters</span> to narrow by branch or semester</p>
                <p>• Type 2+ characters for instant search across name, roll number, or email</p>
                <p>• {showInviteStatus && 'Students already in groups will be marked appropriately.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSearch;
