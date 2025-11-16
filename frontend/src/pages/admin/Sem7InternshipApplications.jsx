import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI, internshipAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';

const Sem7InternshipApplications = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');
  const [filterType, setFilterType] = useState(searchParams.get('type') || 'all');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: 'approved',
    remarks: ''
  });

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applications, filterStatus, filterType]);

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterType !== 'all') params.set('type', filterType);
    setSearchParams(params);
  }, [filterStatus, filterType, setSearchParams]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      
      const response = await adminAPI.listInternshipApplications(params);
      if (response.success) {
        setApplications(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to load applications');
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
      toast.error('Failed to load internship applications');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...applications];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(app => app.status === filterStatus);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(app => app.type === filterType);
    }

    setFilteredApplications(filtered);
  };

  const handleReview = (application) => {
    setSelectedApplication(application);
    setReviewData({
      status: application.status || 'pending',
      remarks: application.adminRemarks || ''
    });
    setShowModal(true);
  };

  const handleSubmitReview = async () => {
    try {
      setIsSubmitting(true);
      const response = await adminAPI.reviewInternshipApplication(selectedApplication._id, {
        status: reviewData.status,
        remarks: reviewData.remarks
      });

      if (response.success) {
        toast.success('Application reviewed successfully');
        setShowModal(false);
        setSelectedApplication(null);
        await loadApplications();
      } else {
        throw new Error(response.message || 'Failed to review application');
      }
    } catch (error) {
      console.error('Failed to review application:', error);
      toast.error(`Failed to review application: ${error.message}`);
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

  const downloadFile = async (applicationId, fileType) => {
    try {
      const response = await internshipAPI.downloadFile(applicationId, fileType);
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading applications...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Internship Applications</h1>
          <p className="text-gray-600">
            Review and manage 6-month and summer internship applications
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{applications.length}</div>
            <div className="text-sm text-gray-600">Total Applications</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {applications.filter(a => a.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {applications.filter(a => a.type === '6month').length}
            </div>
            <div className="text-sm text-gray-600">6-Month</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {applications.filter(a => a.type === 'summer').length}
            </div>
            <div className="text-sm text-gray-600">Summer</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {applications.filter(a => a.status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="6month">6-Month Internship</option>
                <option value="summer">Summer Internship</option>
              </select>
            </div>
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
            <div className="flex items-end">
              <button
                onClick={loadApplications}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Applications ({filteredApplications.length})
            </h2>
          </div>
          
          {filteredApplications.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No applications found</p>
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
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((app) => (
                    <tr key={app._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {app.student?.fullName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {app.student?.misNumber || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          app.type === '6month' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {app.type === '6month' ? '6-Month' : 'Summer'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{app.details?.companyName || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{app.details?.location || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.details?.startDate && app.details?.endDate ? (
                          <>
                            {new Date(app.details.startDate).toLocaleDateString()} - <br />
                            {new Date(app.details.endDate).toLocaleDateString()}
                          </>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.submittedAt 
                          ? new Date(app.submittedAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleReview(app)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Review
                        </button>
                        {(app.uploads?.offerLetterFile || app.uploads?.completionCertificateFile || app.uploads?.reportFile) && (
                          <button
                            onClick={() => {
                              // Show file download options
                              const fileType = app.uploads?.offerLetterFile ? 'offerLetter' : 
                                             app.uploads?.completionCertificateFile ? 'completionCertificate' : 
                                             'report';
                              downloadFile(app._id, fileType);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Files
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Review Modal */}
        {showModal && selectedApplication && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h3 className="text-xl font-semibold text-gray-900">Review Application</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Student: {selectedApplication.student?.fullName} ({selectedApplication.student?.misNumber})
                </p>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                {/* Application Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-gray-900">Application Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">{selectedApplication.type === '6month' ? '6-Month Internship' : 'Summer Internship'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Company:</span>
                      <span className="ml-2 font-medium">{selectedApplication.details?.companyName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <span className="ml-2 font-medium">{selectedApplication.details?.location || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Mode:</span>
                      <span className="ml-2 font-medium capitalize">{selectedApplication.details?.mode || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Start Date:</span>
                      <span className="ml-2 font-medium">
                        {selectedApplication.details?.startDate ? new Date(selectedApplication.details.startDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">End Date:</span>
                      <span className="ml-2 font-medium">
                        {selectedApplication.details?.endDate ? new Date(selectedApplication.details.endDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {selectedApplication.details?.stipendRs && (
                      <div>
                        <span className="text-gray-600">Stipend:</span>
                        <span className="ml-2 font-medium">₹{selectedApplication.details.stipendRs.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* File Downloads */}
                {(selectedApplication.uploads?.offerLetterFile || selectedApplication.uploads?.completionCertificateFile || selectedApplication.uploads?.reportFile) && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Uploaded Files</h4>
                    <div className="space-y-2">
                      {selectedApplication.uploads?.offerLetterFile && (
                        <button
                          onClick={() => downloadFile(selectedApplication._id, 'offerLetter')}
                          className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-left text-sm"
                        >
                          📄 Offer Letter
                        </button>
                      )}
                      {selectedApplication.uploads?.completionCertificateFile && (
                        <button
                          onClick={() => downloadFile(selectedApplication._id, 'completionCertificate')}
                          className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-left text-sm"
                        >
                          📄 Completion Certificate
                        </button>
                      )}
                      {selectedApplication.uploads?.reportFile && (
                        <button
                          onClick={() => downloadFile(selectedApplication._id, 'report')}
                          className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-left text-sm"
                        >
                          📄 Report
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Review Form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reviewData.status}
                    onChange={(e) => setReviewData({...reviewData, status: e.target.value})}
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
                    value={reviewData.remarks}
                    onChange={(e) => setReviewData({...reviewData, remarks: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add remarks for the student (optional)"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedApplication(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sem7InternshipApplications;

