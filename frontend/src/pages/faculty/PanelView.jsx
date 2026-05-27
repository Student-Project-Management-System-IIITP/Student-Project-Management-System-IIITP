import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';

const PanelView = () => {
  const [panels, setPanels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [academicYear] = useState('2025-26');
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [panelDetails, setPanelDetails] = useState(null);

  useEffect(() => {
    fetchFacultyPanels();
  }, []);

  const fetchFacultyPanels = async () => {
    try {
      setIsLoading(true);
      const data = await adminAPI.getFacultyPanels();
      setPanels(data.data?.panels || []);
      setMessage({ type: 'success', text: `Loaded ${data.data?.count || 0} panel assignments` });
    } catch (error) {
      handleApiError(error, (msg) => setMessage({ type: 'error', text: msg }));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPanelDetails = async (panelId) => {
    try {
      const data = await adminAPI.getPanelDetails(panelId);
      setPanelDetails(data.data);
      setSelectedPanel(panelId);
    } catch (error) {
      handleApiError(error, (msg) => setMessage({ type: 'error', text: msg }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl">📋</div>
          <p className="text-gray-600 mt-4">Loading your panels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Panel Assignments</h1>
          <p className="text-gray-600 mt-2">View panels you are assigned to and evaluation details</p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {panels.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg">No panels assigned to you yet</p>
            <p className="text-gray-500 text-sm mt-2">Panels will appear here when admin assigns them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4">
                  <h2 className="text-lg font-semibold">Your Panels ({panels.length})</h2>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {panels.map((panel) => (
                    <button
                      key={panel._id}
                      onClick={() => fetchPanelDetails(panel._id)}
                      className={`w-full px-6 py-4 text-left hover:bg-blue-50 transition ${
                        selectedPanel === panel._id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{panel.panelCode}</h3>
                          <p className="text-sm text-gray-600">
                            {panel.members?.length || 0} members
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          panel.conveyer === 'currentUserEmail' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {panel.conveyer === 'currentUserEmail' ? 'Conveyer' : 'Member'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel Details */}
            <div className="lg:col-span-2">
              {selectedPanel && panelDetails ? (
                <div className="space-y-6">
                  {/* Panel Info Card */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{panelDetails.panelCode}</h2>
                        <p className="text-gray-600 mt-1">Semester {panelDetails.semester}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-medium text-white ${
                        panelDetails.conveyer === 'currentUserEmail' ? 'bg-yellow-600' : 'bg-blue-600'
                      }`}>
                        {panelDetails.conveyer === 'currentUserEmail' ? '👨‍💼 Panel Conveyer' : '👤 Panel Member'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">Active</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Academic Year</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{panelDetails.academicYear}</p>
                      </div>
                    </div>
                  </div>

                  {/* Panel Members */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Panel Members</h3>
                    <div className="space-y-3">
                      {panelDetails.members?.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.department} Department</p>
                          </div>
                          {member.email === panelDetails.conveyer ? (
                            <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                              Conveyer
                            </div>
                          ) : (
                            <div className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
                              Member
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assigned Groups */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Assigned Groups ({panelDetails.groups?.length || 0})
                    </h3>
                    {panelDetails.groups && panelDetails.groups.length > 0 ? (
                      <div className="space-y-3">
                        {panelDetails.groups.map((group, idx) => (
                          <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900">{group.groupCode}</h4>
                                <p className="text-sm text-gray-600">Project: {group.projectCode}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">{group.memberCount || 0} Students</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{group.projectTitle}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No groups assigned to this panel yet</p>
                    )}
                  </div>

                  {/* Evaluation Status */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Status</h3>
                    <div className="space-y-3">
                      {panelDetails.groups && panelDetails.groups.map((group, idx) => {
                        const evaluationStatus = panelDetails.evaluations?.find(e => e.groupId === group._id);
                        const isEvaluated = !!evaluationStatus;
                        
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{group.groupCode}</p>
                              <p className="text-sm text-gray-600">Marks: {evaluationStatus?.marksObtained || 'Pending'}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isEvaluated 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {isEvaluated ? '✓ Submitted' : '⏱ Pending'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600 text-lg">Select a panel to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PanelView;
