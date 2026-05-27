import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';

const PanelConfiguration = () => {
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [semester, setSemester] = useState(5);
  const [config, setConfig] = useState(null);
  const [panels, setPanels] = useState([]);
  const [facultyAvailability, setFacultyAvailability] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [formData, setFormData] = useState({
    panelSize: 3,
    departmentDistribution: { CSE: 1, ECE: 1, ASH: 1 },
    studentGroupSize: { min: 4, max: 5 },
    marksDistribution: { conveyer: 40, member: 30 },
    totalProfessors: 27,
    maxGroupsPerPanel: 10,
    maxPanelsPerProfessor: 3,
    conveyerRotationEnabled: true,
    noConveyerRepeatInSemester: true
  });

  // Group stats state
  const [groupStats, setGroupStats] = useState(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [showAutoAssignConfirm, setShowAutoAssignConfirm] = useState(false);

  // Panel expand state
  const [expandedPanelId, setExpandedPanelId] = useState(null);

  // Edit modal state
  const [editModal, setEditModal] = useState({ open: false, panel: null, tab: 'conveyer' });
  const [editMembers, setEditMembers] = useState([]);
  const [editError, setEditError] = useState('');
  const [isSavingPanel, setIsSavingPanel] = useState(false);
  const [allFaculty, setAllFaculty] = useState([]);

  // Group move state
  const [movingGroupId, setMovingGroupId] = useState(null);
  const [moveTargetPanelId, setMoveTargetPanelId] = useState('');
  const [moveError, setMoveError] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  // Fetch configuration and panels on load
  useEffect(() => {
    fetchFacultyAvailability();
    fetchConfiguration();
    fetchPanels();
    fetchGroupStats();
  }, [academicYear, semester]);

  // Validate configuration when form data changes
  useEffect(() => {
    validateConfiguration();
  }, [formData, facultyAvailability]);

  const fetchConfiguration = async () => {
    try {
      setIsLoading(true);
      const data = await adminAPI.getPanelConfiguration({ academicYear });
      setConfig(data.data);
      setFormData({
        panelSize: data.data.panelSize,
        departmentDistribution: data.data.departmentDistribution,
        studentGroupSize: data.data.studentGroupSize,
        marksDistribution: data.data.marksDistribution,
        totalProfessors: data.data.totalProfessors,
        maxGroupsPerPanel: data.data.maxGroupsPerPanel,
        maxPanelsPerProfessor: data.data.maxPanelsPerProfessor,
        conveyerRotationEnabled: data.data.conveyerRotationEnabled,
        noConveyerRepeatInSemester: data.data.noConveyerRepeatInSemester
      });
      setMessage({ type: 'success', text: 'Configuration loaded successfully' });
    } catch (error) {
      if (error.status === 404) {
        setMessage({ type: 'info', text: 'No configuration exists yet. Create one below.' });
      } else {
        handleApiError(error, (msg) => setMessage({ type: 'error', text: msg }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPanels = async () => {
    try {
      const data = await adminAPI.getPanelsBySemester({ semester, academicYear });
      setPanels(data.data?.panels || []);
    } catch (error) {
      setPanels([]);
    }
  };

  const fetchFacultyAvailability = async () => {
    try {
      const data = await adminAPI.checkFacultyAvailability();
      setFacultyAvailability(data.data);
    } catch (error) {
      console.error('Error fetching faculty availability:', error);
      setFacultyAvailability(null);
    }
  };

  const fetchGroupStats = async () => {
    try {
      setIsLoadingGroups(true);
      const data = await adminAPI.getSemesterGroups({ semester, academicYear });
      setGroupStats(data.data);
    } catch (error) {
      setGroupStats(null);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const fetchAllFaculty = async () => {
    try {
      const data = await adminAPI.getFaculty();
      const list = data.data || data.faculty || data || [];
      setAllFaculty(Array.isArray(list) ? list : []);
    } catch (error) {
      setAllFaculty([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: isNaN(value) ? value : parseInt(value) }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: isNaN(value) ? value : parseInt(value) }));
    }
  };

  const validateMarksDistribution = () => {
    const numMembers = formData.panelSize - 1;
    const totalMarks = formData.marksDistribution.conveyer + (formData.marksDistribution.member * numMembers);
    return totalMarks === 100;
  };

  const handleSaveConfiguration = async (e) => {
    e.preventDefault();
    if (!validateMarksDistribution()) {
      const numMembers = formData.panelSize - 1;
      const currentSum = formData.marksDistribution.conveyer + (formData.marksDistribution.member * numMembers);
      setMessage({
        type: 'error',
        text: `Marks distribution invalid. Conveyer (${formData.marksDistribution.conveyer}%) + ${numMembers} members × ${formData.marksDistribution.member}% = ${currentSum}%. Must equal 100%.`
      });
      return;
    }
    try {
      setIsSaving(true);
      await adminAPI.setPanelConfiguration(academicYear, formData);
      setMessage({ type: 'success', text: 'Panel configuration saved successfully!' });
      await fetchConfiguration();
    } catch (error) {
      handleApiError(error, (msg) => setMessage({ type: 'error', text: msg }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePanels = async (e) => {
    e.preventDefault();
    if (validationWarnings.length > 0) {
      setMessage({
        type: 'error',
        text: `Cannot generate panels. Fix these issues first:\n${validationWarnings.join('\n')}`
      });
      return;
    }
    try {
      setIsGenerating(true);
      const result = await adminAPI.generatePanels({ semester, academicYear });
      setMessage({
        type: 'success',
        text: `Generated ${result.data.count} panels successfully for Semester ${semester}!`
      });
      await fetchPanels();
      await fetchGroupStats();
    } catch (error) {
      handleApiError(error, (msg) => setMessage({ type: 'error', text: msg }));
    } finally {
      setIsGenerating(false);
    }
  };

  const validateConfiguration = () => {
    const warnings = [];
    if (!facultyAvailability) return;
    const expectedPanels = Math.ceil(formData.totalProfessors / formData.panelSize);
    const { CSE, ECE, ASH } = formData.departmentDistribution;
    const neededCSE = CSE * expectedPanels;
    if (facultyAvailability.CSE < neededCSE)
      warnings.push(`⚠️ CSE: Need ${neededCSE} faculty (${CSE} per panel × ${expectedPanels} panels), but only ${facultyAvailability.CSE} available`);
    const neededECE = ECE * expectedPanels;
    if (facultyAvailability.ECE < neededECE)
      warnings.push(`⚠️ ECE: Need ${neededECE} faculty (${ECE} per panel × ${expectedPanels} panels), but only ${facultyAvailability.ECE} available`);
    const neededASH = ASH * expectedPanels;
    if (facultyAvailability.ASH < neededASH)
      warnings.push(`⚠️ ASH: Need ${neededASH} faculty (${ASH} per panel × ${expectedPanels} panels), but only ${facultyAvailability.ASH} available`);
    setValidationWarnings(warnings);
  };

  // ── Auto-Assign ──
  const handleAutoAssign = async () => {
    setShowAutoAssignConfirm(false);
    try {
      setIsAutoAssigning(true);
      const result = await adminAPI.autoAssignGroups({ semester, academicYear });
      setMessage({
        type: 'success',
        text: result.data?.message || `Assigned ${result.data?.assigned || 0} groups.`
      });
      await fetchPanels();
      await fetchGroupStats();
    } catch (error) {
      handleApiError(error, (msg) => setMessage({ type: 'error', text: msg }));
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // ── Edit Modal ──
  const openEditModal = (panel) => {
    setEditModal({ open: true, panel, tab: 'conveyer' });
    setEditMembers(panel.members.map(m => ({
      faculty: m.faculty?._id || m.faculty,
      facultyName: m.faculty?.fullName || 'Unknown',
      department: m.department || m.faculty?.department || '',
      role: m.role
    })));
    setEditError('');
    setMovingGroupId(null);
    setMoveError('');
    fetchAllFaculty();
  };

  const closeEditModal = () => {
    setEditModal({ open: false, panel: null, tab: 'conveyer' });
    setEditMembers([]);
    setEditError('');
  };

  const handleSaveMembers = async () => {
    try {
      setIsSavingPanel(true);
      setEditError('');
      await adminAPI.updatePanelMembers(editModal.panel._id, { members: editMembers });
      setMessage({ type: 'success', text: 'Panel updated successfully.' });
      await fetchPanels();
      closeEditModal();
    } catch (error) {
      const errMsg = error?.response?.data?.message || error?.message || 'Failed to update panel';
      if (errMsg.toLowerCase().includes('conveyer')) {
        setEditError(errMsg);
      } else {
        setEditError(errMsg);
      }
    } finally {
      setIsSavingPanel(false);
    }
  };

  const handleConveyerChange = (newFacultyId) => {
    setEditMembers(prev =>
      prev.map(m => ({
        ...m,
        role: m.faculty === newFacultyId ? 'conveyer' : 'member'
      }))
    );
    setEditError('');
  };

  const handleRemoveFacultyFromPanel = (facultyId) => {
    setEditMembers(prev => prev.filter(m => m.faculty !== facultyId));
  };

  const handleAddFacultyToPanel = (facultyId) => {
    const fac = allFaculty.find(f => (f._id || f.id) === facultyId);
    if (!fac) return;
    if (editMembers.some(m => m.faculty === facultyId)) return;
    setEditMembers(prev => [
      ...prev,
      {
        faculty: fac._id || fac.id,
        facultyName: fac.fullName,
        department: fac.department || '',
        role: 'member'
      }
    ]);
  };

  // ── Group Move ──
  const handleMoveGroup = async (groupId) => {
    if (!moveTargetPanelId) return;
    try {
      setIsMoving(true);
      setMoveError('');
      await adminAPI.moveGroupToPanel(moveTargetPanelId, groupId);
      setMessage({ type: 'success', text: 'Group moved successfully.' });
      setMovingGroupId(null);
      setMoveTargetPanelId('');
      await fetchPanels();
      await fetchGroupStats();
    } catch (error) {
      const errMsg = error?.response?.data?.message || error?.message || 'Move failed';
      if (errMsg.toLowerCase().includes('capacity') || errMsg.toLowerCase().includes('quota')) {
        setMoveError(`⚠️ ${errMsg}`);
      } else {
        setMoveError(errMsg);
      }
    } finally {
      setIsMoving(false);
    }
  };

  const handleDeallocateGroup = async (groupId) => {
    try {
      setIsMoving(true);
      setMoveError('');
      await adminAPI.deallocateGroupFromPanel(groupId);
      setMessage({ type: 'success', text: 'Group deallocated successfully.' });
      setMovingGroupId(null);
      await fetchPanels();
      await fetchGroupStats();
    } catch (error) {
      const errMsg = error?.response?.data?.message || error?.message || 'Deallocation failed';
      setMoveError(errMsg);
    } finally {
      setIsMoving(false);
    }
  };

  // ── Helpers ──
  const getConveyer = (panel) => panel.members?.find(m => m.role === 'conveyer');
  const getMemberCount = (panel) => panel.members?.length || 0;
  const getAssignedGroups = () => {
    if (!groupStats) return [];
    return groupStats.assigned || [];
  };
  const getPanelGroups = (panelId) => {
    return getAssignedGroups().filter(g => {
      const pid = g.panel?._id || g.panel;
      return pid === panelId || pid?.toString?.() === panelId?.toString?.();
    });
  };

  const marksTotal = formData.marksDistribution.conveyer + (formData.marksDistribution.member * (formData.panelSize - 1));
  const expectedPanels = Math.ceil(formData.totalProfessors / formData.panelSize);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel Management Configuration</h1>
          <p className="text-gray-600 mt-2">Configure evaluation panels for your institution</p>
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

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin">⚙️</div>
            <p className="text-gray-600 mt-2">Loading configuration...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Configuration Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSaveConfiguration} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Panel Settings</h2>

                {/* Academic Year */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 2025-26"
                  />
                </div>

                {/* Semester Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[1,2,3,4,5,6,7,8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                {/* Panel Size */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Panel Size (Members)</label>
                  <input type="number" name="panelSize" value={formData.panelSize} onChange={handleInputChange}
                    min="2" max="5" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <p className="text-xs text-gray-500 mt-1">Number of faculty members per panel</p>
                </div>

                {/* Department Distribution */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Department Distribution</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['CSE', 'ECE', 'ASH'].map(dept => (
                      <div key={dept}>
                        <label className="text-xs text-gray-600">{dept}</label>
                        <input type="number" name={`departmentDistribution.${dept}`} value={formData.departmentDistribution[dept]}
                          onChange={handleInputChange} min="0" max={formData.panelSize}
                          className="w-full px-3 py-2 border border-gray-300 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Members from each department per panel</p>
                </div>

                {/* Student Group Size */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Student Group Size</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-600">Min Members</label>
                      <input type="number" name="studentGroupSize.min" value={formData.studentGroupSize.min}
                        onChange={handleInputChange} min="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Max Members</label>
                      <input type="number" name="studentGroupSize.max" value={formData.studentGroupSize.max}
                        onChange={handleInputChange} min="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>

                {/* Marks Distribution */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Marks Distribution (%)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-600">Conveyer</label>
                      <input type="number" name="marksDistribution.conveyer" value={formData.marksDistribution.conveyer}
                        onChange={handleInputChange} min="0" max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Member (each)</label>
                      <input type="number" name="marksDistribution.member" value={formData.marksDistribution.member}
                        onChange={handleInputChange} min="0" max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                  <p className={`text-xs mt-2 ${marksTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    Total: Conveyer {formData.marksDistribution.conveyer}% + {formData.panelSize - 1} members × {formData.marksDistribution.member}% = {marksTotal}%
                  </p>
                </div>

                {/* Total Professors */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Professors</label>
                  <input type="number" name="totalProfessors" value={formData.totalProfessors} onChange={handleInputChange}
                    min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                {/* Max Groups Per Panel */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Groups Per Panel</label>
                  <input type="number" name="maxGroupsPerPanel" value={formData.maxGroupsPerPanel} onChange={handleInputChange}
                    min="1" max="50" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <p className="text-xs text-gray-500 mt-1">Maximum student groups each panel can evaluate</p>
                </div>

                {/* Checkboxes */}
                <div className="mb-6 space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" name="conveyerRotationEnabled" checked={formData.conveyerRotationEnabled}
                      onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                    <span className="ml-3 text-sm text-gray-700">Enable Conveyer Rotation</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" name="noConveyerRepeatInSemester" checked={formData.noConveyerRepeatInSemester}
                      onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                    <span className="ml-3 text-sm text-gray-700">Prevent Conveyer Repeat in Same Semester</span>
                  </label>
                </div>

                {/* Save Button */}
                <button type="submit" disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition">
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </form>
            </div>

            {/* Summary Card */}
            <div className="space-y-6">
              {/* ═══ SECTION 1: Groups Overview ═══ */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Group Assignment Overview</h3>
                {isLoadingGroups ? (
                  <p className="text-sm text-gray-500">Loading group stats...</p>
                ) : groupStats ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Groups:</span>
                      <span className="font-medium bg-gray-100 text-gray-800 px-3 py-1 rounded-full">{groupStats.summary?.total || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Eligible:</span>
                      <span className="font-medium bg-green-100 text-green-800 px-3 py-1 rounded-full">{groupStats.summary?.eligible || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Assigned:</span>
                      <span className="font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{groupStats.summary?.assigned || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Unassigned:</span>
                      <span className="font-medium bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">{groupStats.summary?.unassigned || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Ineligible:</span>
                      <span className="font-medium bg-red-100 text-red-800 px-3 py-1 rounded-full">{groupStats.summary?.ineligible || 0}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No group data available.</p>
                )}
                {/* Auto-Assign Button */}
                {panels.length > 0 && (groupStats?.summary?.eligible || 0) > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    {showAutoAssignConfirm ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 mb-2">
                          This will randomly assign <strong>{groupStats.summary.eligible}</strong> eligible groups across <strong>{panels.length}</strong> panels.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={handleAutoAssign} disabled={isAutoAssigning}
                            className="flex-1 bg-green-600 text-white py-1.5 px-3 rounded text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 transition">
                            {isAutoAssigning ? 'Assigning...' : 'Confirm'}
                          </button>
                          <button onClick={() => setShowAutoAssignConfirm(false)}
                            className="flex-1 bg-gray-200 text-gray-700 py-1.5 px-3 rounded text-sm font-medium hover:bg-gray-300 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAutoAssignConfirm(true)} disabled={isAutoAssigning}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition">
                        🔄 Auto-Assign Groups to Panels
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Faculty Availability */}
              {facultyAvailability && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Faculty Availability</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">CSE:</span>
                      <span className="font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{facultyAvailability.CSE} faculty</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">ECE:</span>
                      <span className="font-medium bg-purple-100 text-purple-800 px-3 py-1 rounded-full">{facultyAvailability.ECE} faculty</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">ASH:</span>
                      <span className="font-medium bg-green-100 text-green-800 px-3 py-1 rounded-full">{facultyAvailability.ASH} faculty</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-gray-600 font-semibold">Total:</span>
                      <span className="font-semibold">{facultyAvailability.total} faculty</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">⚠️ Configuration Issues</h4>
                  <ul className="text-xs text-red-800 space-y-1">
                    {validationWarnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Configuration Summary */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Panel Size:</span>
                    <span className="font-medium">{formData.panelSize} members</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected Panels:</span>
                    <span className="font-medium">{expectedPanels} panels</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Professors:</span>
                    <span className="font-medium">{formData.totalProfessors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Marks Total:</span>
                    <span className={`font-medium ${marksTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>{marksTotal}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Groups/Panel:</span>
                    <span className="font-medium">{formData.maxGroupsPerPanel}</span>
                  </div>
                </div>
              </div>

              {/* Generate Panels */}
              <form onSubmit={handleGeneratePanels} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Panels</h3>
                <p className="text-sm text-gray-600 mb-4">Create panels for Semester {semester} with the current configuration</p>
                <button type="submit" disabled={isGenerating || validationWarnings.length > 0}
                  className={`w-full text-white py-2 rounded-lg font-medium transition ${
                    validationWarnings.length > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  } disabled:bg-gray-400`}>
                  {isGenerating ? 'Generating...' : validationWarnings.length > 0 ? 'Fix Errors First' : 'Generate Panels'}
                </button>
              </form>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Configure panel parameters above</li>
                  <li>Select academic year</li>
                  <li>Click "Generate Panels" to create balanced panels</li>
                  <li>Panels are created with 1/3 from each department</li>
                  <li>Conveyer role rotates to prevent overload</li>
                  <li>Click on any panel card to edit conveyer, faculty, or groups</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SECTION 2: Panel Cards ═══ */}
        {panels.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Panels for Semester {semester} ({panels.length} panels)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {panels.map((panel) => {
                const conveyer = getConveyer(panel);
                const panelGroups = getPanelGroups(panel._id);
                const isExpanded = expandedPanelId === panel._id;

                return (
                  <div key={panel._id}
                    className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => openEditModal(panel)}>
                    <div className="p-5">
                      {/* Panel Header */}
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Panel #{panel.panelNumber}</h3>
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">Active</span>
                      </div>

                      {/* Conveyer */}
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Conveyer</span>
                        <p className="text-sm font-semibold text-indigo-700">
                          {conveyer?.faculty?.fullName || 'Not assigned'}
                        </p>
                      </div>

                      {/* Faculty List */}
                      <div className="mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Faculty ({getMemberCount(panel)})</span>
                        <div className="mt-1 space-y-1">
                          {panel.members?.map((member, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className={`w-2 h-2 rounded-full ${member.role === 'conveyer' ? 'bg-indigo-500' : 'bg-gray-400'}`}></span>
                              <span className="text-gray-700">{member.faculty?.fullName || 'Unknown'}</span>
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs">{member.department || member.faculty?.department}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Groups Count */}
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Assigned Groups</span>
                        <span className={`font-semibold text-sm ${panelGroups.length >= formData.maxGroupsPerPanel ? 'text-red-600' : 'text-gray-900'}`}>
                          [{panelGroups.length}] / [{formData.maxGroupsPerPanel}]
                        </span>
                      </div>

                      {/* Expand toggle */}
                      {panelGroups.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedPanelId(isExpanded ? null : panel._id); }}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                          {isExpanded ? '▲ Hide Groups' : '▼ Show Groups'}
                        </button>
                      )}
                    </div>

                    {/* Expanded Groups */}
                    {isExpanded && panelGroups.length > 0 && (
                      <div className="border-t bg-gray-50 px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <ul className="space-y-1">
                          {panelGroups.map(g => (
                            <li key={g._id} className="text-xs text-gray-700 flex justify-between items-center">
                              <span>{g.name}</span>
                              {g.project?.title && (
                                <span className="text-gray-400 truncate ml-2 max-w-[120px]">{g.project.title}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Total Panels:</strong> {panels.length} panels for Semester {semester}
                {' '} · Click any panel to edit
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {panels.length === 0 && !isLoading && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-center text-gray-600">
              No panels generated yet for Semester {semester}. Configure settings above and click "Generate Panels".
            </p>
          </div>
        )}
      </div>

      {/* ═══ SECTION 3: Edit Modal ═══ */}
      {editModal.open && editModal.panel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeEditModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Edit Panel #{editModal.panel.panelNumber}</h2>
              <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {['conveyer', 'faculty', 'groups'].map(tab => (
                <button key={tab}
                  onClick={() => { setEditModal(prev => ({ ...prev, tab })); setEditError(''); }}
                  className={`flex-1 py-3 text-sm font-medium text-center transition ${
                    editModal.tab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab === 'conveyer' ? '👑 Conveyer' : tab === 'faculty' ? '👥 Faculty' : '📁 Groups'}
                </button>
              ))}
            </div>

            {/* Error Display */}
            {editError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {editError}
              </div>
            )}

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>

              {/* ── Conveyer Tab ── */}
              {editModal.tab === 'conveyer' && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Select which faculty member should be the conveyer for this panel.</p>
                  <div className="space-y-2">
                    {editMembers.map(m => (
                      <label key={m.faculty}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          m.role === 'conveyer' ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                        <input type="radio" name="conveyer" checked={m.role === 'conveyer'}
                          onChange={() => handleConveyerChange(m.faculty)}
                          className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="font-medium text-gray-900">{m.facultyName}</span>
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{m.department}</span>
                        </div>
                        {m.role === 'conveyer' && (
                          <span className="ml-auto text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">Current</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Faculty Tab ── */}
              {editModal.tab === 'faculty' && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Manage panel faculty members. The conveyer will remain marked.</p>

                  {/* Current Members */}
                  <div className="space-y-2 mb-6">
                    {editMembers.map(m => (
                      <div key={m.faculty} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${m.role === 'conveyer' ? 'bg-indigo-500' : 'bg-gray-400'}`}></span>
                          <span className="font-medium text-sm">{m.facultyName}</span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{m.department}</span>
                          {m.role === 'conveyer' && <span className="text-xs text-indigo-600">(conveyer)</span>}
                        </div>
                        {m.role !== 'conveyer' && (
                          <button onClick={() => handleRemoveFacultyFromPanel(m.faculty)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Faculty */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Add Faculty Member</label>
                    <select
                      onChange={(e) => { if (e.target.value) { handleAddFacultyToPanel(e.target.value); e.target.value = ''; } }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Select faculty to add...</option>
                      {allFaculty
                        .filter(f => !editMembers.some(m => m.faculty === (f._id || f.id)))
                        .map(f => (
                          <option key={f._id || f.id} value={f._id || f.id}>
                            {f.fullName} ({f.department})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── Groups Tab ── */}
              {editModal.tab === 'groups' && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Groups assigned to this panel. Use "Move" to reassign.</p>
                  {moveError && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">{moveError}</div>
                  )}

                  {(() => {
                    const panelGroups = getPanelGroups(editModal.panel._id);
                    if (panelGroups.length === 0) {
                      return <p className="text-sm text-gray-500">No groups assigned to this panel yet.</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {panelGroups.map(g => (
                          <div key={g._id} className="p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-sm text-gray-900">{g.name}</span>
                                {g.project?.title && <p className="text-xs text-gray-500 mt-0.5">{g.project.title}</p>}
                              </div>
                              {movingGroupId === g._id ? (
                                <div className="flex items-center gap-2">
                                  <select value={moveTargetPanelId}
                                    onChange={(e) => setMoveTargetPanelId(e.target.value)}
                                    className="text-xs border rounded px-2 py-1">
                                    <option value="">Select panel...</option>
                                    {panels.filter(p => p._id !== editModal.panel._id).map(p => (
                                      <option key={p._id} value={p._id}>Panel #{p.panelNumber}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => handleMoveGroup(g._id)} disabled={!moveTargetPanelId || isMoving}
                                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded disabled:bg-gray-300 hover:bg-blue-700 transition">
                                    {isMoving ? '...' : 'Go'}
                                  </button>
                                  <button onClick={() => { setMovingGroupId(null); setMoveError(''); }}
                                    className="text-xs text-gray-500 hover:text-gray-700">✕</button>
                                </div>
                              ) : (
                                <div className="flex gap-3">
                                  <button onClick={() => { setMovingGroupId(g._id); setMoveTargetPanelId(''); setMoveError(''); }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">Move →</button>
                                  <button onClick={() => {
                                      if(window.confirm('Are you sure you want to deallocate this group from the panel?')) {
                                          handleDeallocateGroup(g._id);
                                      }
                                    }}
                                    className="text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap">Deallocate</button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {editModal.tab !== 'groups' && (
              <div className="px-6 py-4 bg-gray-50 border-t flex gap-3 justify-end">
                <button onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={handleSaveMembers} disabled={isSavingPanel}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition">
                  {isSavingPanel ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelConfiguration;
