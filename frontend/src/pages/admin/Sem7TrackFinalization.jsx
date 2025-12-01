import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { formatFacultyName } from '../../utils/formatUtils';

const Sem7TrackFinalization = () => {
  const [activeTab, setActiveTab] = useState('internship1'); // 'internship1' or 'track'
  
  // Track Finalization Tab State
  const [trackChoices, setTrackChoices] = useState([]);
  const [filteredChoices, setFilteredChoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, needs_info, approved
  const [filterTrack, setFilterTrack] = useState('all'); // all, internship, coursework
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalizationData, setFinalizationData] = useState({
    finalizedTrack: '',
    verificationStatus: 'approved',
    remarks: ''
  });

  // Internship 1 Track Changes Tab State
  const [internship1Choices, setInternship1Choices] = useState([]);
  const [internship1Loading, setInternship1Loading] = useState(true);
  const [selectedInternship1Choice, setSelectedInternship1Choice] = useState(null);
  const [showInternship1Modal, setShowInternship1Modal] = useState(false);
  const [isSubmittingInternship1, setIsSubmittingInternship1] = useState(false);
  const [internship1ChangeData, setInternship1ChangeData] = useState({
    targetTrack: '',
    remarks: ''
  });

  useEffect(() => {
    if (activeTab === 'track') {
    loadTrackChoices();
    } else if (activeTab === 'internship1') {
      loadInternship1Choices();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'track') {
    applyFilters();
    }
  }, [trackChoices, filterStatus, filterTrack, activeTab]);

  const loadTrackChoices = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.listSem7TrackChoices();
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

    if (filterStatus !== 'all') {
      filtered = filtered.filter(choice => choice.verificationStatus === filterStatus);
    }

    if (filterTrack !== 'all') {
      filtered = filtered.filter(choice => {
        const track = choice.finalizedTrack || choice.chosenTrack;
        return track === filterTrack;
      });
    }

    // Sort by email address (primary) or MIS number (fallback)
    filtered.sort((a, b) => {
      const emailA = (a.email || '').toLowerCase();
      const emailB = (b.email || '').toLowerCase();
      
      if (emailA && emailB) {
        return emailA.localeCompare(emailB);
      }
      
      // If email is missing, sort by MIS number
      const misA = a.misNumber || '';
      const misB = b.misNumber || '';
      
      if (misA && misB) {
        return misA.localeCompare(misB);
      }
      
      // If both missing, maintain original order
      return 0;
    });

    setFilteredChoices(filtered);
  };

  const handleFinalize = (choice) => {
    setSelectedChoice(choice);
    // Prefill with finalized track if exists, otherwise use chosen track (all tracks are finalized by default)
    setFinalizationData({
      finalizedTrack: choice.finalizedTrack || choice.chosenTrack || '',
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

    // Check if track is being changed (all tracks are finalized by default)
    const previousTrack = selectedChoice.finalizedTrack || selectedChoice.chosenTrack;
    const isChangingTrack = previousTrack && previousTrack !== finalizationData.finalizedTrack;
    
    // Show confirmation if changing track
    if (isChangingTrack) {
      const confirmMessage = `Are you sure you want to change the track from "${previousTrack === 'internship' ? '6-Month Internship' : 'Coursework'}" to "${finalizationData.finalizedTrack === 'internship' ? '6-Month Internship' : 'Coursework'}"?\n\n` +
        `This will:\n` +
        `- Reset workflow flags to defaults\n` +
        `- Cancel any active projects (Major Project 1/Internship 1) if switching from coursework\n` +
        `- Reset internship outcome to provisional if switching from internship\n\n` +
        `Note: Internship applications will be preserved as records but won't affect the new track.`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const response = await adminAPI.finalizeSem7Track(selectedChoice.studentId, {
        finalizedTrack: finalizationData.finalizedTrack,
        verificationStatus: finalizationData.verificationStatus,
        remarks: finalizationData.remarks
      });

      if (response.success) {
        const previousTrack = selectedChoice.finalizedTrack || selectedChoice.chosenTrack;
        const message = `Track changed successfully from "${previousTrack === 'internship' ? '6-Month Internship' : 'Coursework'}" to "${finalizationData.finalizedTrack === 'internship' ? '6-Month Internship' : 'Coursework'}"`;
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

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { status: 'warning', text: 'Pending' },
      needs_info: { status: 'error', text: 'Needs Info' },
      approved: { status: 'success', text: 'Approved' },
      rejected: { status: 'error', text: 'Rejected' }
    };
    return <StatusBadge status={statusMap[status]?.status || 'warning'} text={statusMap[status]?.text || status} />;
  };

  const getTrackBadge = (track) => {
    if (!track) return null;
    const trackMap = {
      internship: { color: 'bg-purple-100 text-purple-800', text: '6-Month Internship' },
      coursework: { color: 'bg-blue-100 text-blue-800', text: 'Coursework' }
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${trackMap[track]?.color || 'bg-gray-100 text-gray-800'}`}>
        {trackMap[track]?.text || track}
      </span>
    );
  };

  // Internship 1 Track Changes Functions
  const loadInternship1Choices = async () => {
    try {
      setInternship1Loading(true);
      const response = await adminAPI.listInternship1TrackChoices();
      if (response.success) {
        setInternship1Choices(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to load Internship 1 track choices');
      }
    } catch (error) {
      console.error('Failed to load Internship 1 track choices:', error);
      toast.error('Failed to load Internship 1 track choices');
    } finally {
      setInternship1Loading(false);
    }
  };

  const handleChangeInternship1Track = (choice) => {
    setSelectedInternship1Choice(choice);
    // Determine target track (opposite of current, or default to 'project' if none)
    let targetTrack;
    if (choice.currentTrack === 'none') {
      targetTrack = ''; // Let admin choose
    } else if (choice.currentTrack === 'project') {
      targetTrack = 'application';
    } else {
      targetTrack = 'project';
    }
    setInternship1ChangeData({
      targetTrack,
      remarks: choice.currentTrack === 'none' ? 
        'Assigned by admin' :
        (choice.application?.adminRemarks || choice.project?.title ? 
          `Switched ${targetTrack === 'application' ? 'from Internship-I under Institute Faculty' : 'to Internship-I under Institute Faculty'}` : '')
    });
    setShowInternship1Modal(true);
  };

  const handleSubmitInternship1Change = async () => {
    if (!internship1ChangeData.targetTrack) {
      toast.error('Please select a target track');
      return;
    }

    const currentTrack = selectedInternship1Choice.currentTrack;
    const targetTrack = internship1ChangeData.targetTrack;
    
    // Show confirmation
    let confirmMessage;
    if (currentTrack === 'none') {
      confirmMessage = `Are you sure you want to assign this student to "${targetTrack === 'project' ? 'Internship 1 Project (Institute Faculty)' : 'Summer Internship Application'}"?\n\n` +
        `This will:\n` +
        `${targetTrack === 'application' ? '- Create a summer internship application for the student\n- Student will need to submit their internship evidence' : '- Allow student to register for Internship 1 project\n- Student will need to complete the project under a faculty mentor'}`;
    } else {
      confirmMessage = `Are you sure you want to change from "${currentTrack === 'project' ? 'Internship 1 Project (Institute Faculty)' : 'Summer Internship Application'}" to "${targetTrack === 'project' ? 'Internship 1 Project (Institute Faculty)' : 'Summer Internship Application'}"?\n\n` +
        `This will:\n` +
        `${targetTrack === 'application' ? '- Cancel and reset all Internship 1 project progress\n- Create/update summer internship application' : '- Reject summer internship application if approved\n- Allow student to register for Internship 1 project'}`;
    }
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setIsSubmittingInternship1(true);
      const response = await adminAPI.changeInternship1Track(selectedInternship1Choice.studentId, {
        targetTrack: internship1ChangeData.targetTrack,
        remarks: internship1ChangeData.remarks
      });

      if (response.success) {
        const successMessage = selectedInternship1Choice.currentTrack === 'none' 
          ? `Track assigned successfully to ${targetTrack === 'project' ? 'Internship 1 Project' : 'Summer Internship Application'}`
          : (response.message || 'Internship 1 track changed successfully');
        toast.success(successMessage);
        setShowInternship1Modal(false);
        setSelectedInternship1Choice(null);
        await loadInternship1Choices();
      } else {
        throw new Error(response.message || 'Failed to change Internship 1 track');
      }
    } catch (error) {
      console.error('Failed to change Internship 1 track:', error);
      toast.error(`Failed to change track: ${error.message}`);
    } finally {
      setIsSubmittingInternship1(false);
    }
  };

  const isLoading = (activeTab === 'track' && loading) || (activeTab === 'internship1' && internship1Loading);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Semester 7 Track Finalization</h1>
          <p className="text-gray-600">
            Manage track choices and Internship 1 track changes for Semester 7
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('internship1')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'internship1'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Internship 1 Track Changes ({internship1Choices.length})
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'track'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Track Finalization ({trackChoices.length})
            </button>
          </nav>
        </div>

        {/* Internship 1 Track Changes Tab */}
        {activeTab === 'internship1' && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-gray-900">{internship1Choices.length}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {internship1Choices.filter(c => c.currentTrack === 'project' || c.currentTrack === 'project_pending').length}
                </div>
                <div className="text-sm text-gray-600">Internship 1 Projects</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-green-600">
                  {internship1Choices.filter(c => c.currentTrack === 'application' || c.currentTrack === 'application_pending').length}
                </div>
                <div className="text-sm text-gray-600">Summer Applications</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {internship1Choices.filter(c => c.currentTrack === 'none').length}
                </div>
                <div className="text-sm text-gray-600">Not Selected</div>
              </div>
            </div>

            {/* Internship 1 Track Choices Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Internship 1 Track Choices ({internship1Choices.length})
                </h2>
                <button
                  onClick={loadInternship1Choices}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Refresh
                </button>
              </div>
              
              {internship1Choices.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No Internship 1 track choices found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MIS No.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact No.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Track</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor/Company</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title/Domain</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {internship1Choices.map((choice, index) => (
                        <tr key={choice._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {choice.fullName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {choice.misNumber}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {choice.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {choice.contactNumber}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {choice.branch}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {choice.currentTrack === 'project' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Internship 1 Project
                              </span>
                            ) : choice.currentTrack === 'project_pending' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                Internship 1 Project (Pending Registration)
                              </span>
                            ) : choice.currentTrack === 'application' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Summer Internship (Approved)
                              </span>
                            ) : choice.currentTrack === 'application_pending' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Summer Internship (Pending)
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Not Selected
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {choice.currentTrack === 'project' && choice.project?.faculty ? (
                              <div>
                                <div className="font-medium">{formatFacultyName(choice.project.faculty) || choice.project.faculty.name || 'N/A'}</div>
                                <div className="text-xs text-gray-500">{choice.project.faculty.department}</div>
                              </div>
                            ) : choice.currentTrack === 'project_pending' ? (
                              <span className="text-gray-500 italic">Student needs to register</span>
                            ) : choice.application?.companyName ? (
                              <div className="font-medium">{choice.application.companyName}</div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {choice.currentTrack === 'project' && choice.project?.title ? (
                              <div className="max-w-xs truncate" title={choice.project.title}>
                                {choice.project.title}
                              </div>
                            ) : choice.application?.companyName ? (
                              <span className="text-gray-400">—</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {choice.currentTrack === 'project' && choice.project ? (
                              <StatusBadge 
                                status={
                                  choice.project.status === 'active' ? 'success' :
                                  choice.project.status === 'faculty_allocated' ? 'info' :
                                  choice.project.status === 'registered' ? 'warning' :
                                  'error'
                                }
                                text={
                                  choice.project.status === 'active' ? 'Active' :
                                  choice.project.status === 'faculty_allocated' ? 'Allocated' :
                                  choice.project.status === 'registered' ? 'Registered' :
                                  choice.project.status
                                }
                              />
                            ) : choice.currentTrack === 'project_pending' ? (
                              <StatusBadge
                                status="warning"
                                text="Pending Registration"
                              />
                            ) : choice.application ? (
                              <StatusBadge
                                status={
                                  choice.application.status === 'verified_pass' ? 'success' :
                                  choice.application.status === 'verified_fail' || choice.application.status === 'absent' ? 'error' :
                                  choice.application.status === 'needs_info' ? 'error' :
                                  choice.application.status === 'pending_verification' ? 'info' :
                                  'warning'
                                }
                                text={
                                  choice.application.status === 'verified_pass' ? 'Verified (Pass)' :
                                  choice.application.status === 'verified_fail' ? 'Verified (Fail)' :
                                  choice.application.status === 'absent' ? 'Absent' :
                                  choice.application.status === 'needs_info' ? 'Needs Info' :
                                  choice.application.status === 'pending_verification' ? 'Pending Verification' :
                                  'Submitted'
                                }
                              />
                            ) : choice.currentTrack === 'none' ? (
                              <span className="text-xs text-gray-500">—</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleChangeInternship1Track(choice)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              {choice.currentTrack === 'none' ? 'Assign Track' : 'Change Track'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Track Finalization Tab */}
        {activeTab === 'track' && (
          <>
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{trackChoices.length}</div>
            <div className="text-sm text-gray-600">Total Choices</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {trackChoices.filter(c => c.verificationStatus === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {trackChoices.filter(c => (c.finalizedTrack || c.chosenTrack) === 'coursework').length}
            </div>
            <div className="text-sm text-gray-600">Coursework</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {trackChoices.filter(c => (c.finalizedTrack || c.chosenTrack) === 'internship').length}
            </div>
            <div className="text-sm text-gray-600">Internship</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="needs_info">Needs Info</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Track</label>
              <select
                value={filterTrack}
                onChange={(e) => setFilterTrack(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Tracks</option>
                <option value="internship">Internship</option>
                <option value="coursework">Coursework</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadTrackChoices}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Track Choices Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Track Choices ({filteredChoices.length})
            </h2>
          </div>
          
          {filteredChoices.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No track choices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chosen Track
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Finalized Track
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredChoices.map((choice) => (
                    <tr key={choice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{choice.fullName}</div>
                          <div className="text-sm text-gray-500">{choice.email}</div>
                          <div className="text-xs text-gray-400">MIS: {choice.misNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTrackBadge(choice.chosenTrack)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(choice.verificationStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTrackBadge(choice.finalizedTrack || choice.chosenTrack)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {choice.choiceSubmittedAt 
                          ? new Date(choice.choiceSubmittedAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleFinalize(choice)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Change Track
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}

        {/* Modals - Outside tab conditionals */}
        {/* Finalization Modal */}
        {showModal && selectedChoice && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  Change Track
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Student: {selectedChoice.fullName} ({selectedChoice.misNumber})
                </p>
                {(selectedChoice.finalizedTrack || selectedChoice.chosenTrack) && 
                 (selectedChoice.finalizedTrack || selectedChoice.chosenTrack) !== finalizationData.finalizedTrack && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <strong>Warning:</strong> Changing track will reset workflow flags and cancel active projects.
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chosen Track
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    {getTrackBadge(selectedChoice.chosenTrack)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Finalized Track <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={finalizationData.finalizedTrack}
                    onChange={(e) => setFinalizationData({...finalizationData, finalizedTrack: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select track</option>
                    <option value="internship">6-Month Internship</option>
                    <option value="coursework">Coursework</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={finalizationData.verificationStatus}
                    onChange={(e) => setFinalizationData({...finalizationData, verificationStatus: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="needs_info">Needs Info</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={finalizationData.remarks}
                    onChange={(e) => setFinalizationData({...finalizationData, remarks: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add remarks for the student (optional)"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedChoice(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFinalization}
                  disabled={!finalizationData.finalizedTrack || isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update Track'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Internship 1 Track Change Modal */}
        {showInternship1Modal && selectedInternship1Choice && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  Change Internship 1 Track
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Student: {selectedInternship1Choice.fullName} ({selectedInternship1Choice.misNumber})
                </p>
                {selectedInternship1Choice.currentTrack !== 'none' && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <strong>Warning:</strong> Changing track will reset progress and cancel the current option.
                  </div>
                )}
                {selectedInternship1Choice.currentTrack === 'none' && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    <strong>Info:</strong> This student has not selected a track yet. Please assign them to either Internship 1 Project or Summer Internship Application.
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Track
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    {selectedInternship1Choice.currentTrack === 'project' || selectedInternship1Choice.currentTrack === 'project_pending' ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedInternship1Choice.currentTrack === 'project_pending' ? 'Internship 1 Project (Pending Registration)' : 'Internship 1 Project (Institute Faculty)'}
                      </span>
                    ) : selectedInternship1Choice.currentTrack === 'application' || selectedInternship1Choice.currentTrack === 'application_pending' ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Summer Internship Application
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not Selected
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedInternship1Choice.currentTrack === 'none' ? 'Assign To' : 'Change To'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={internship1ChangeData.targetTrack}
                    onChange={(e) => setInternship1ChangeData({...internship1ChangeData, targetTrack: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select target track</option>
                    {selectedInternship1Choice.currentTrack !== 'project' && selectedInternship1Choice.currentTrack !== 'project_pending' && (
                      <option value="project">Internship 1 Project (Institute Faculty)</option>
                    )}
                    {selectedInternship1Choice.currentTrack !== 'application' && selectedInternship1Choice.currentTrack !== 'application_pending' && (
                      <option value="application">Summer Internship Application</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={internship1ChangeData.remarks}
                    onChange={(e) => setInternship1ChangeData({...internship1ChangeData, remarks: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder={selectedInternship1Choice.currentTrack === 'none' ? "Add remarks (e.g., 'Assigned by admin')" : "Add remarks (e.g., 'Switched from Internship-I under Institute Faculty')"}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInternship1Modal(false);
                    setSelectedInternship1Choice(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitInternship1Change}
                  disabled={!internship1ChangeData.targetTrack || isSubmittingInternship1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingInternship1 ? (selectedInternship1Choice.currentTrack === 'none' ? 'Assigning...' : 'Changing...') : (selectedInternship1Choice.currentTrack === 'none' ? 'Assign Track' : 'Change Track')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sem7TrackFinalization;

