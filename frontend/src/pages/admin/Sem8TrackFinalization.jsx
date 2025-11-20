import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';

const Sem8TrackFinalization = () => {
  const [trackChoices, setTrackChoices] = useState([]);
  const [filteredChoices, setFilteredChoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, needs_info, approved
  const [filterTrack, setFilterTrack] = useState('all'); // all, internship, major2
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalizationData, setFinalizationData] = useState({
    finalizedTrack: '',
    verificationStatus: 'approved',
    remarks: ''
  });

  useEffect(() => {
    loadTrackChoices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [trackChoices, filterStatus, filterTrack]);

  const loadTrackChoices = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.listSem8TrackChoices();
      if (response.success) {
        setTrackChoices(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to load track choices');
      }
    } catch (error) {
      console.error('Failed to load track choices:', error);
      toast.error('Failed to load track choices');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...trackChoices];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(choice => choice.verificationStatus === filterStatus);
    }

    // Filter by track (convert 'coursework' to 'major2' for Type 2 students)
    if (filterTrack !== 'all') {
      filtered = filtered.filter(choice => {
        const finalized = choice.finalizedTrack;
        const chosen = choice.chosenTrack;
        const track = finalized || chosen;
        
        // For Type 2 students, 'coursework' maps to 'major2'
        const displayTrack = (track === 'coursework' && choice.studentType === 'type2') ? 'major2' : track;
        return displayTrack === filterTrack;
      });
    }

    // Sort by email address (primary) or MIS number (fallback)
    filtered.sort((a, b) => {
      const emailA = (a.email || '').toLowerCase();
      const emailB = (b.email || '').toLowerCase();
      
      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }
      
      const misA = a.misNumber || '';
      const misB = b.misNumber || '';
      
      if (misA && misB) {
        return misA.localeCompare(misB);
      }
      
      return 0;
    });

    setFilteredChoices(filtered);
  };

  const handleFinalize = (choice) => {
    setSelectedChoice(choice);
    // Convert 'coursework' to 'major2' for display if Type 2
    const displayTrack = (choice.finalizedTrack === 'coursework' && choice.studentType === 'type2') 
      ? 'major2' 
      : (choice.finalizedTrack || choice.chosenTrack || '');
    
    setFinalizationData({
      finalizedTrack: displayTrack || '',
      verificationStatus: choice.verificationStatus || 'approved',
      remarks: choice.adminRemarks || ''
    });
    setShowModal(true);
  };

  const handleSubmitFinalization = async () => {
    if (!finalizationData.finalizedTrack) {
      toast.error('Please select a finalized track');
      return;
    }

    // Check if track is being changed
    const previousDisplayTrack = (selectedChoice.finalizedTrack === 'coursework' && selectedChoice.studentType === 'type2')
      ? 'major2'
      : (selectedChoice.finalizedTrack || selectedChoice.chosenTrack || '');
    const isChangingTrack = previousDisplayTrack && previousDisplayTrack !== finalizationData.finalizedTrack;
    
    // Show confirmation if changing track
    if (isChangingTrack) {
      const previousLabel = previousDisplayTrack === 'internship' ? '6-Month Internship' : 'Major Project 2';
      const newLabel = finalizationData.finalizedTrack === 'internship' ? '6-Month Internship' : 'Major Project 2';
      
      const confirmMessage = `Are you sure you want to change the track from "${previousLabel}" to "${newLabel}"?\n\n` +
        `This will:\n` +
        `- Reset workflow flags to defaults\n` +
        `- Cancel any active projects (Major Project 2/Internship 2) if switching tracks\n` +
        `- Reset internship outcome to provisional if switching from internship\n\n` +
        `Note: Internship applications will be preserved as records but won't affect the new track.`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      
      // Convert 'major2' back to 'coursework' for backend (Type 2 only)
      const trackForBackend = (finalizationData.finalizedTrack === 'major2' && selectedChoice.studentType === 'type2')
        ? 'coursework'
        : finalizationData.finalizedTrack;
      
      const response = await adminAPI.finalizeSem8Track(selectedChoice.studentId, {
        finalizedTrack: trackForBackend,
        verificationStatus: finalizationData.verificationStatus,
        remarks: finalizationData.remarks
      });

      if (response.success) {
        const previousLabel = previousDisplayTrack === 'internship' ? '6-Month Internship' : 'Major Project 2';
        const newLabel = finalizationData.finalizedTrack === 'internship' ? '6-Month Internship' : 'Major Project 2';
        const message = isChangingTrack
          ? `Track changed successfully from "${previousLabel}" to "${newLabel}"`
          : `Track finalized successfully as "${newLabel}"`;
        toast.success(message);
        setShowModal(false);
        setSelectedChoice(null);
        await loadTrackChoices();
      } else {
        throw new Error(response.message || 'Failed to finalize track');
      }
    } catch (error) {
      console.error('Failed to finalize track:', error);
      toast.error(`Failed to finalize track: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderVerificationBadge = (status) => {
    const statusMap = {
      approved: { status: 'success', text: 'Approved' },
      pending: { status: 'warning', text: 'Pending' },
      needs_info: { status: 'error', text: 'Needs Info' },
      rejected: { status: 'error', text: 'Rejected' }
    };
    const config = statusMap[status] || { status: 'info', text: status || 'Unknown' };
    return <StatusBadge status={config.status} text={config.text} />;
  };

  const renderTrackLabel = (track, studentType) => {
    if (!track) {
      return <span className="text-sm text-gray-500">Not submitted</span>;
    }

    // Convert 'coursework' to 'major2' for Type 2 display
    const displayTrack = (track === 'coursework' && studentType === 'type2') ? 'major2' : track;

    const config = displayTrack === 'major2' || displayTrack === 'coursework'
      ? { color: 'bg-indigo-500/70', label: 'Major Project 2 Track' }
      : { color: 'bg-emerald-500/70', label: '6-Month Internship Track' };

    return (
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
        <span className="text-sm font-medium text-gray-900">{config.label}</span>
      </div>
    );
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (error) {
      return '-';
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Semester 8 Track Finalization</h1>
          <p className="text-gray-600">
            Manage track choices for Type 2 students (Type 1 students are auto-enrolled in Major Project 2)
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="needs_info">Needs Info</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Track</label>
              <select
                value={filterTrack}
                onChange={(e) => setFilterTrack(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tracks</option>
                <option value="major2">Major Project 2</option>
                <option value="internship">6-Month Internship</option>
              </select>
            </div>
          </div>
        </div>

        {/* Track Choices Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading track choices...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chosen Track</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finalized Track</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredChoices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        No track choices found
                      </td>
                    </tr>
                  ) : (
                    filteredChoices.map((choice) => {
                      const chosenDisplayTrack = (choice.chosenTrack === 'coursework' && choice.studentType === 'type2')
                        ? 'major2'
                        : choice.chosenTrack;
                      const finalizedDisplayTrack = (choice.finalizedTrack === 'coursework' && choice.studentType === 'type2')
                        ? 'major2'
                        : choice.finalizedTrack;

                      return (
                        <tr key={choice._id || choice.studentId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{choice.fullName || '-'}</div>
                            <div className="text-sm text-gray-500">{choice.misNumber || '-'} • {choice.email || '-'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              choice.studentType === 'type1' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {choice.studentType === 'type1' ? 'Type 1' : 'Type 2'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {renderTrackLabel(chosenDisplayTrack, choice.studentType)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {renderTrackLabel(finalizedDisplayTrack, choice.studentType)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {renderVerificationBadge(choice.verificationStatus)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(choice.choiceSubmittedAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleFinalize(choice)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Finalize
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Finalization Modal */}
        {showModal && selectedChoice && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Finalize Track Choice
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                      <div className="text-sm text-gray-900">
                        {selectedChoice.fullName} ({selectedChoice.misNumber})
                      </div>
                      <div className="text-sm text-gray-500">{selectedChoice.email}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Finalized Track</label>
                      <select
                        value={finalizationData.finalizedTrack}
                        onChange={(e) => setFinalizationData({ ...finalizationData, finalizedTrack: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select track...</option>
                        <option value="major2">Major Project 2</option>
                        <option value="internship">6-Month Internship</option>
                      </select>
                      {selectedChoice.studentType === 'type1' && (
                        <p className="mt-1 text-sm text-gray-500">
                          Note: Students who completed 6-month internship in Sem 7 must be finalized to Major Project 2
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label>
                      <select
                        value={finalizationData.verificationStatus}
                        onChange={(e) => setFinalizationData({ ...finalizationData, verificationStatus: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="needs_info">Needs Info</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                      <textarea
                        value={finalizationData.remarks}
                        onChange={(e) => setFinalizationData({ ...finalizationData, remarks: e.target.value })}
                        rows={4}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter remarks..."
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleSubmitFinalization}
                    disabled={isSubmitting || !finalizationData.finalizedTrack}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Finalizing...' : 'Finalize Track'}
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedChoice(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sem8TrackFinalization;

