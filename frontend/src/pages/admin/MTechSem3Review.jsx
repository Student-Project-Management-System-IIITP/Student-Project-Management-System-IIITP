import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';

const INTERNSHIP_STATUS_MAP = {
  submitted: { status: 'warning', text: 'Submitted' },
  pending_verification: { status: 'warning', text: 'Pending Verification' },
  needs_info: { status: 'error', text: 'Needs Info' },
  verified_pass: { status: 'success', text: 'Verified (Pass)' },
  verified_fail: { status: 'error', text: 'Verified (Fail)' },
  absent: { status: 'error', text: 'Absent' }
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'needs_info', label: 'Needs Info' },
  { value: 'verified_pass', label: 'Verified (Pass)' },
  { value: 'verified_fail', label: 'Verified (Fail)' },
  { value: 'absent', label: 'Absent' }
];

const MTechSem3Review = () => {
  const [activeTab, setActiveTab] = useState('all'); // all, internship, major

  const [trackChoices, setTrackChoices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [majorProjects, setMajorProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [reviewData, setReviewData] = useState({ status: 'submitted', remarks: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [trackResp, appsResp] = await Promise.all([
        adminAPI.listMTechSem3TrackChoices(),
        adminAPI.listInternshipApplications({ semester: 3 })
      ]);

      setTrackChoices(trackResp?.data || []);
      const apps = (appsResp?.data || []).filter(app => app.type === '6month');
      setApplications(apps);
      // Fetch major project 1 for M.Tech Sem 3
      try {
        const majorResp = await adminAPI.getProjects({ semester: 3, projectType: 'major1' });
        setMajorProjects(majorResp?.data || []);
      } catch {
        setMajorProjects([]);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load Sem 3 review data:', error);
      toast.error('Failed to load M.Tech Sem 3 data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filteredApplications = useMemo(() => {
    if (filterStatus === 'all') return applications;
    return applications.filter(app => app.status === filterStatus);
  }, [applications, filterStatus]);

  const trackChoiceMap = useMemo(() => {
    const map = new Map();
    trackChoices.forEach(choice => {
      if (choice?.studentId) {
        map.set(choice.studentId.toString(), choice);
      }
    });
    return map;
  }, [trackChoices]);

  const summary = useMemo(() => {
    const internshipTrack = trackChoices.filter(choice =>
      (choice.finalizedTrack || choice.chosenTrack) === 'internship'
    ).length;
    const majorTrack = trackChoices.filter(choice =>
      (choice.finalizedTrack || choice.chosenTrack) === 'coursework'
    ).length;
    return {
      totalTrackChoices: trackChoices.length,
      internshipTrack,
      majorTrack,
      pendingApplications: applications.filter(app =>
        ['submitted', 'pending_verification'].includes(app.status)
      ).length,
      verifiedApplications: applications.filter(app => app.status === 'verified_pass').length
    };
  }, [trackChoices, applications]);

  const openReviewModal = (application) => {
    setSelectedApplication(application);
    setReviewData({
      status: application.status || 'submitted',
      remarks: application.adminRemarks || ''
    });
    setShowModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedApplication) return;
    try {
      setIsSubmitting(true);
      await adminAPI.reviewInternshipApplication(selectedApplication._id, {
        status: reviewData.status,
        adminRemarks: reviewData.remarks
      });
      toast.success('Application updated successfully');
      setShowModal(false);
      setSelectedApplication(null);
      await loadData();
    } catch (error) {
      console.error('Failed to review application:', error);
      toast.error(error.message || 'Failed to review application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusBadge = (status) => {
    const config = INTERNSHIP_STATUS_MAP[status] || { status: 'warning', text: status || 'Unknown' };
    return <StatusBadge status={config.status} text={config.text} />;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-wide text-indigo-600 font-semibold">
            M.Tech Semester 3
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Track & Internship Management</h1>
          <p className="text-gray-600 mt-2">
            Review and manage track choices, 6-month internships, and Major Project 1 for M.Tech Semester 3.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200 flex gap-4">
          <button
            className={`py-2 px-4 -mb-px border-b-2 font-semibold transition-all ${activeTab === 'all' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-indigo-600'}`}
            onClick={() => setActiveTab('all')}
          >
            All Students
          </button>
          <button
            className={`py-2 px-4 -mb-px border-b-2 font-semibold transition-all ${activeTab === 'internship' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-indigo-600'}`}
            onClick={() => setActiveTab('internship')}
          >
            6-Month Internship
          </button>
          <button
            className={`py-2 px-4 -mb-px border-b-2 font-semibold transition-all ${activeTab === 'major' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-indigo-600'}`}
            onClick={() => setActiveTab('major')}
          >
            Major Project 1
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'all' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All M.Tech Semester 3 Students</h2>
              <p className="text-sm text-gray-500">Track choices, verification status, and more.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">Loading...</td>
                    </tr>
                  ) : trackChoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">No submissions yet.</td>
                    </tr>
                  ) : (
                    trackChoices.map(choice => (
                      <tr key={choice.studentId}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{choice.fullName}</div>
                          <div className="text-sm text-gray-500">{choice.misNumber}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{choice.email || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">{(choice.finalizedTrack || choice.chosenTrack) === 'internship' ? 'Internship Track' : 'Major Project Track'}</td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            status={
                              choice.verificationStatus === 'approved'
                                ? 'success'
                                : choice.verificationStatus === 'needs_info'
                                  ? 'warning'
                                  : choice.verificationStatus === 'rejected'
                                    ? 'error'
                                    : 'info'
                            }
                            text={choice.verificationStatus || 'pending'}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'internship' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">6-Month Internship Applications</h2>
                  <p className="text-sm text-gray-500">Submissions and status for Semester 3.</p>
                  {lastUpdated && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last updated {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">Filter by status:</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border-gray-300 rounded-md text-sm"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={loadData}
                    className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-1"
                  >
                    <span>🔄</span>
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Letter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                          Loading applications...
                        </div>
                      </td>
                    </tr>
                  ) : filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">No applications found for the selected filters.</td>
                    </tr>
                  ) : (
                    filteredApplications.map(app => {
                      const student = app.student || {};
                      const choice = trackChoiceMap.get((student._id || '').toString());
                      return (
                        <tr key={app._id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{student.fullName || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{student.misNumber || '—'}</div>
                            <div className="text-sm text-gray-500">{student.collegeEmail || student.email || '—'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{choice ? (choice.finalizedTrack || choice.chosenTrack) === 'internship' ? 'Internship Track' : 'Major Project Track' : 'No submission'}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{app.details?.companyName || '—'}</div>
                            <div className="text-xs text-gray-500">{app.details?.location || ''}</div>
                          </td>
                          <td className="px-6 py-4">{app.details?.offerLetterLink ? (<a href={app.details.offerLetterLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">View Offer Letter</a>) : (<span className="text-sm text-gray-500">Not provided</span>)}</td>
                          <td className="px-6 py-4">{renderStatusBadge(app.status)}</td>
                          <td className="px-6 py-4 text-sm"><button onClick={() => openReviewModal(app)} className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Review</button></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'major' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Major Project 1</h2>
              <p className="text-sm text-gray-500">Registrations and status for Major Project 1 (Semester 3).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student(s)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">Loading...</td>
                    </tr>
                  ) : majorProjects.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">No projects found.</td>
                    </tr>
                  ) : (
                    majorProjects.map(project => (
                      <tr key={project._id}>
                        <td className="px-6 py-4">
                          {project.group && project.group.members && project.group.members.length > 0 ? (
                            <ul>
                              {project.group.members.map(m => (
                                <li key={m.student?._id || m._id}>{m.student?.fullName || m.fullName || '—'}</li>
                              ))}
                            </ul>
                          ) : (
                            <span>{project.student?.fullName || '—'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{project.title || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{project.faculty?.fullName || 'Not Allocated'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">{project.status || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Review Application</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={reviewData.status} onChange={(e) => setReviewData(prev => ({ ...prev, status: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500">
                    {STATUS_OPTIONS.filter(option => option.value !== 'all').map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea value={reviewData.remarks} onChange={(e) => setReviewData(prev => ({ ...prev, remarks: e.target.value }))} rows={4} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Add guidance or reasons for the selected status" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700">Cancel</button>
                <button onClick={handleSubmitReview} disabled={isSubmitting} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">{isSubmitting ? 'Saving...' : 'Save Review'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MTechSem3Review;