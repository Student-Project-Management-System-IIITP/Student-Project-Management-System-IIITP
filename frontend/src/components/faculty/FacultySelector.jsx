import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';

const FacultySelector = ({ 
  selectedFaculties = [], 
  onSelectionChange, 
  facultyTypes = ['Regular', 'Adjunct', 'On Lien'],
  maxSelections = 7,
  disabled = false,
  placeholder = "Select faculty members..."
}) => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Load faculties based on allowed types
  useEffect(() => {
    const loadFaculties = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getFaculty();
        const allFaculties = response.data || [];
        
        // Filter faculties based on allowed types
        const filteredFaculties = allFaculties.filter(faculty => 
          facultyTypes.includes(faculty.mode)
        );
        
        setFaculties(filteredFaculties);
      } catch (error) {
        console.error('Failed to load faculties:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFaculties();
  }, [facultyTypes]);

  // Filter faculties based on search term
  const filteredFaculties = faculties.filter(faculty =>
    faculty.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faculty.facultyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faculty.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFacultyToggle = (faculty) => {
    if (disabled) return;

    const isSelected = selectedFaculties.some(selected => 
      selected.faculty._id === faculty._id
    );

    if (isSelected) {
      // Remove faculty
      const updatedSelection = selectedFaculties.filter(selected => 
        selected.faculty._id !== faculty._id
      );
      onSelectionChange(updatedSelection);
    } else {
      // Add faculty (if under limit)
      if (selectedFaculties.length < maxSelections) {
        const newSelection = [
          ...selectedFaculties,
          {
            faculty: faculty,
            priority: selectedFaculties.length + 1
          }
        ];
        onSelectionChange(newSelection);
      }
    }
  };

  const handlePriorityChange = (facultyId, newPriority) => {
    if (disabled) return;

    const updatedSelection = selectedFaculties.map(item => {
      if (item.faculty._id === facultyId) {
        return { ...item, priority: newPriority };
      }
      return item;
    }).sort((a, b) => a.priority - b.priority);

    // Reassign priorities sequentially
    const resequencedSelection = updatedSelection.map((item, index) => ({
      ...item,
      priority: index + 1
    }));

    onSelectionChange(resequencedSelection);
  };

  const removeFaculty = (facultyId) => {
    if (disabled) return;

    const updatedSelection = selectedFaculties
      .filter(item => item.faculty._id !== facultyId)
      .map((item, index) => ({
        ...item,
        priority: index + 1
      }));

    onSelectionChange(updatedSelection);
  };

  const getFacultyTypeColor = (mode) => {
    switch (mode) {
      case 'Regular':
        return 'bg-green-100 text-green-800';
      case 'Adjunct':
        return 'bg-blue-100 text-blue-800';
      case 'On Lien':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading faculties...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected Faculties */}
      {selectedFaculties.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Selected Faculty ({selectedFaculties.length}/{maxSelections})
          </h4>
          <div className="space-y-2">
            {selectedFaculties
              .sort((a, b) => a.priority - b.priority)
              .map((item) => (
                <div key={item.faculty._id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-600">
                      #{item.priority}
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={maxSelections}
                      value={item.priority}
                      onChange={(e) => handlePriorityChange(item.faculty._id, parseInt(e.target.value))}
                      className="w-16 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={disabled}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {item.faculty.fullName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.faculty.facultyId} • {item.faculty.department}
                    </div>
                  </div>
                  
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getFacultyTypeColor(item.faculty.mode)}`}>
                    {item.faculty.mode}
                  </span>
                  
                  {!disabled && (
                    <button
                      onClick={() => removeFaculty(item.faculty._id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove faculty"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Faculty Selection Dropdown */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled}
          />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            disabled={disabled}
          >
            <svg className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredFaculties.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No faculties found
              </div>
            ) : (
              filteredFaculties.map((faculty) => {
                const isSelected = selectedFaculties.some(selected => 
                  selected.faculty._id === faculty._id
                );
                const isDisabled = !isSelected && selectedFaculties.length >= maxSelections;

                return (
                  <div
                    key={faculty._id}
                    onClick={() => handleFacultyToggle(faculty)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                      isSelected ? 'bg-blue-50' : ''
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {faculty.fullName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {faculty.facultyId} • {faculty.department} • {faculty.designation}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getFacultyTypeColor(faculty.mode)}`}>
                          {faculty.mode}
                        </span>
                        {isSelected && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selection Info */}
      <div className="text-sm text-gray-600">
        Select up to {maxSelections} faculty members. Drag to reorder priorities.
      </div>
    </div>
  );
};

export default FacultySelector;
