import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';

const EvaluationSubmission = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedEval, setSelectedEval] = useState(null);
  const [formData, setFormData] = useState({
    marksObtained: '',
    comments: ''
  });

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      setIsLoading(true);
      const data = await adminAPI.getFacultyEvaluations();
      setEvaluations(data.data || []);
      setMessage({ type: 'success', text: `Loaded ${data.data?.length || 0} evaluation tasks` });
    } catch (error) {
      handleApiError(error, (msg) => setMessage({ type: 'error', text: msg }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEvaluation = (evaluation) => {
    setSelectedEval(evaluation);
    setFormData({
      marksObtained: evaluation.marksObtained || '',
      comments: evaluation.comments || ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateMarks = () => {
    const marks = parseInt(formData.marksObtained);
    if (isNaN(marks)) {
      setMessage({ type: 'error', text: 'Marks must be a number' });
      return false;
    }
    if (marks < 0 || marks > 100) {
      setMessage({ type: 'error', text: 'Marks must be between 0 and 100' });
      return false;
    }
    return true;
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();

    if (!validateMarks()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await adminAPI.submitEvaluationMarks({
        groupId: selectedEval.groupId,
        panelId: selectedEval.panelId,
        marksObtained: parseInt(formData.marksObtained),
        comments: formData.comments
      });
      setMessage({ type: 'success', text: 'Evaluation submitted successfully!' });
      await fetchEvaluations();
      setSelectedEval(null);
      setFormData({ marksObtained: '', comments: '' });
    } catch (error) {
      handleApiError(error, (msg) => setMessage({ type: 'error', text: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEvaluationStatus = (evaluation) => {
    if (evaluation.status === 'submitted') {
      return { label: '✓ Submitted', color: 'bg-green-100 text-green-700' };
    } else if (evaluation.status === 'draft') {
      return { label: '📝 Draft', color: 'bg-yellow-100 text-yellow-700' };
    } else {
      return { label: '⏱ Pending', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const getRole = (evaluation) => {
    return evaluation.role === 'conveyer' ? 'Panel Conveyer' : 'Panel Member';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl">📝</div>
          <p className="text-gray-600 mt-4">Loading evaluations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Evaluation Submission</h1>
          <p className="text-gray-600 mt-2">Submit evaluation marks for assigned groups</p>
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

        {evaluations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg">No evaluations assigned to you yet</p>
            <p className="text-gray-500 text-sm mt-2">Groups will appear here when assigned to your panels</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Evaluation List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4">
                  <h2 className="text-lg font-semibold">Evaluations ({evaluations.length})</h2>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {evaluations.map((evaluation) => {
                    const status = getEvaluationStatus(evaluation);
                    return (
                      <button
                        key={evaluation._id}
                        onClick={() => handleSelectEvaluation(evaluation)}
                        className={`w-full px-6 py-4 text-left hover:bg-blue-50 transition ${
                          selectedEval?._id === evaluation._id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <h3 className="font-semibold text-gray-900">{evaluation.groupCode}</h3>
                          <p className="text-xs text-gray-600">{evaluation.panelCode}</p>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-xs text-gray-600">{getRole(evaluation)}</span>
                            <div className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                              {status.label}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Evaluation Form */}
            <div className="lg:col-span-2">
              {selectedEval ? (
                <div className="space-y-6">
                  {/* Group Info Card */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">{selectedEval.groupCode}</h2>
                      <p className="text-gray-600 mt-1">Panel: {selectedEval.panelCode}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Project Title</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{selectedEval.projectTitle}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Your Role</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">{getRole(selectedEval)}</p>
                      </div>
                    </div>

                    {/* Marks Info for Conveyer */}
                    {selectedEval.role === 'conveyer' && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-900 font-medium">👨‍💼 As Conveyer</p>
                        <p className="text-sm text-yellow-700 mt-2">
                          Your marks carry {selectedEval.conveyerMarksPercentage || 40}% weight in final marks calculation
                        </p>
                      </div>
                    )}

                    {/* Marks Info for Member */}
                    {selectedEval.role === 'member' && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900 font-medium">👤 As Panel Member</p>
                        <p className="text-sm text-blue-700 mt-2">
                          Your marks carry {selectedEval.memberMarksPercentage || 30}% weight in final marks calculation
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Group Members */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Members</h3>
                    <div className="space-y-2">
                      {selectedEval.groupMembers?.length > 0 ? (
                        selectedEval.groupMembers.map((member, idx) => (
                          <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg">
                            <span className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm font-semibold">
                              {idx + 1}
                            </span>
                            <div className="ml-3">
                              <p className="font-medium text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-600">{member.email}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">No member information available</p>
                      )}
                    </div>
                  </div>

                  {/* Evaluation Form */}
                  <form onSubmit={handleSubmitEvaluation} className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Submit Marks</h3>

                    {/* Marks Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marks Obtained (0-100)
                      </label>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <input
                            type="number"
                            name="marksObtained"
                            value={formData.marksObtained}
                            onChange={handleInputChange}
                            min="0"
                            max="100"
                            placeholder="Enter marks between 0-100"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                          />
                        </div>
                        <div className="text-center pb-3">
                          <p className="text-2xl font-bold text-blue-600">
                            {formData.marksObtained || '0'}
                          </p>
                          <p className="text-xs text-gray-600">/100</p>
                        </div>
                      </div>
                    </div>

                    {/* Marks Breakdown */}
                    {formData.marksObtained && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900 font-medium mb-2">Marks Contribution:</p>
                        <div className="text-sm text-blue-800 space-y-1">
                          {selectedEval.role === 'conveyer' ? (
                            <p>
                              Conveyer weight: {formData.marksObtained} × {selectedEval.conveyerMarksPercentage || 40}% 
                              = <strong>{(parseInt(formData.marksObtained) * (selectedEval.conveyerMarksPercentage || 40) / 100).toFixed(1)} points</strong>
                            </p>
                          ) : (
                            <p>
                              Member weight: {formData.marksObtained} × {selectedEval.memberMarksPercentage || 30}% 
                              = <strong>{(parseInt(formData.marksObtained) * (selectedEval.memberMarksPercentage || 30) / 100).toFixed(1)} points</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comments (Optional)
                      </label>
                      <textarea
                        name="comments"
                        value={formData.comments}
                        onChange={handleInputChange}
                        rows="4"
                        placeholder="Add evaluation feedback, strengths, areas for improvement..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">{formData.comments.length}/500 characters</p>
                    </div>

                    {/* Status Info */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Current Status:</strong> {
                          selectedEval.status === 'submitted' ? '✓ Already Submitted' :
                          selectedEval.status === 'draft' ? '📝 Draft Saved' :
                          '⏱ Not Started'
                        }
                      </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4">
                      <button
                        type="submit"
                        disabled={isSubmitting || !formData.marksObtained}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEval(null);
                          setFormData({ marksObtained: '', comments: '' });
                        }}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>

                  {/* Help Text */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Evaluation Guidelines</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Marks should be between 0 and 100</li>
                      <li>Consider project quality, presentation, and technical content</li>
                      <li>Your marks weight varies by your role (conveyer vs member)</li>
                      <li>Comments help provide feedback to students</li>
                      <li>You can edit submissions until the deadline</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600 text-lg">Select a group to submit evaluation</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationSubmission;
