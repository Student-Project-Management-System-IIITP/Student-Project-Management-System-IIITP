import React, { useState, useEffect, useRef } from 'react';
import { facultyAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import { showError, showSuccess } from '../../utils/toast';

const ManageFaculty = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(false);
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    mode: '',
    designation: ''
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const listContainerRef = useRef(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const loadFaculties = async (overridePage, overridePageSize) => {
    try {
      setLoading(true);
      const currentPage = typeof overridePage === 'number' ? overridePage : page;
      const currentPageSize = typeof overridePageSize === 'number' ? overridePageSize : pageSize;
      const response = await facultyAPI.searchFaculty(search, sort, currentPage, currentPageSize);
      const data = response.data || [];
      setFaculties(data);
      const total =
        typeof response.totalCount === 'number'
          ? response.totalCount
          : typeof response.count === 'number'
          ? response.count
          : data.length;
      setTotalCount(total);
      const totalPagesValue =
        typeof response.totalPages === 'number' && response.totalPages > 0
          ? response.totalPages
          : Math.max(1, Math.ceil(total / currentPageSize));
      setTotalPages(totalPagesValue);
      setPage(response.currentPage || currentPage || 1);
    } catch (error) {
      const message = handleApiError(error, false);
      showError(message || 'Failed to load faculty list');
    } finally {
      setLoading(false);
    }
  };

  const loadFacultyDetails = async (facultyId) => {
    try {
      setProfileLoading(true);
      const response = await facultyAPI.getFacultyDetails(facultyId);
      setSelectedFaculty(response.data || null);
    } catch (error) {
      const message = handleApiError(error, false);
      showError(message || 'Failed to load faculty profile');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const measurePageSize = () => {
      if (!listContainerRef.current) return;
      const containerHeight = listContainerRef.current.clientHeight || 400;
      const rowHeight = 72;
      const calculated = Math.max(5, Math.floor(containerHeight / rowHeight));
      setPageSize(calculated);
    };

    measurePageSize();
    window.addEventListener('resize', measurePageSize);
    return () => {
      window.removeEventListener('resize', measurePageSize);
    };
  }, []);

  useEffect(() => {
    loadFaculties();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadFaculties(1);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setTimeout(() => {
      setPage(1);
      loadFaculties(1);
    }, 0);
  };

  const handlePrevPage = () => {
    if (page <= 1) return;
    const newPage = page - 1;
    setPage(newPage);
    loadFaculties(newPage);
  };

  const handleNextPage = () => {
    if (page >= totalPages) return;
    const newPage = page + 1;
    setPage(newPage);
    loadFaculties(newPage);
  };

  const openEditModal = () => {
    if (!selectedFaculty || !selectedFaculty.faculty) return;
    const { faculty, user } = selectedFaculty;
    setEditForm({
      fullName: faculty.fullName || '',
      email: user?.email || '',
      phone: faculty.phone || '',
      department: faculty.department || '',
      mode: faculty.mode || '',
      designation: faculty.designation || ''
    });
    setIsEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFaculty || !selectedFaculty.faculty) return;
    try {
      const facultyId = selectedFaculty.faculty.facultyId;
      const payload = {
        fullName: editForm.fullName,
        phone: editForm.phone,
        department: editForm.department,
        mode: editForm.mode,
        designation: editForm.designation,
        email: editForm.email
      };
      const response = await facultyAPI.updateFaculty(facultyId, payload);
      setIsEditOpen(false);
      await loadFacultyDetails(facultyId);
      await loadFaculties();
      const message = response.message || 'Faculty profile updated successfully';
      showSuccess(message);
    } catch (error) {
      const message = handleApiError(error, false);
      showError(message || 'Failed to update faculty profile');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedFaculty || !selectedFaculty.faculty) return;
    const confirmed = window.confirm('Reset password for this faculty? A new random password will be generated.');
    if (!confirmed) return;
    try {
      const facultyId = selectedFaculty.faculty.facultyId;
      const response = await facultyAPI.resetPassword(facultyId);
      const newPassword = response.data?.newPassword || response.newPassword;
      if (newPassword) {
        setNewPassword(newPassword);
        setIsResetModalOpen(true);
      }
      showSuccess('Password reset successfully');
    } catch (error) {
      const message = handleApiError(error, false);
      showError(message || 'Failed to reset faculty password');
    }
  };

  const copyPassword = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      showSuccess('Password copied to clipboard');
    } catch (error) {
      showError('Failed to copy password');
    }
  };

  const renderGroupCard = (group) => {
    return (
      <div key={group._id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{group.name || group.groupName || `Group ${group._id?.slice(-4)}`}</h3>
            <p className="text-xs text-gray-500">ID: {group._id}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Sem {group.semester}
            </span>
            {group.project?.title && (
              <p className="text-xs text-gray-500 mt-1">{group.project.title}</p>
            )}
          </div>
        </div>
        <div className="mt-2">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Members</h4>
          <div className="space-y-1">
            {group.members && group.members.map((member, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-gray-900">{member.student?.fullName || member.name}</span>
                <span className="text-gray-500">{member.student?.misNumber || member.misNumber}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Faculty Profiles</h1>
          <p className="text-gray-600 text-sm mt-1">Search, view, and update faculty profiles, and manage their assigned groups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, phone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sort}
                  onChange={handleSortChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  <option value="department">Department (A → Z)</option>
                  <option value="designation">Designation (A → Z)</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
          </div>

          <div
            ref={listContainerRef}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-h-[480px] overflow-y-auto flex flex-col"
          >
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Faculty Results</h2>
            {loading ? (
              <div className="py-6 text-sm text-gray-500">Loading...</div>
            ) : faculties.length === 0 ? (
              <div className="py-6 text-sm text-gray-500">No faculty found.</div>
            ) : (
              <ul className="divide-y divide-gray-200 flex-1">
                {faculties.map((f) => (
                  <li
                    key={f._id || f.facultyId}
                    className={`py-2 cursor-pointer ${
                      selectedFaculty && selectedFaculty.faculty && selectedFaculty.faculty.facultyId === f.facultyId
                        ? 'bg-indigo-50'
                        : ''
                    }`}
                    onClick={() => loadFacultyDetails(f.facultyId)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{f.fullName}</p>
                        <p className="text-xs text-gray-500">{f.user?.email}</p>
                        <p className="text-xs text-gray-500">{f.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{f.department} • {f.mode}</p>
                        <p className="text-[11px] text-gray-400">{f.designation}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-3 mt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={page <= 1}
                className={
                  'px-3 py-1 rounded border text-xs font-medium ' +
                  (page <= 1
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50')
                }
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={page >= totalPages}
                className={
                  'px-3 py-1 rounded border text-xs font-medium ' +
                  (page >= totalPages
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50')
                }
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[320px]">
            {!selectedFaculty ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Select a faculty from the list to view profile.
              </div>
            ) : profileLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Loading profile...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedFaculty.faculty.fullName}</h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedFaculty.faculty.department} • {selectedFaculty.faculty.designation}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={openEditModal}
                      className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-800 text-xs font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={handleResetPassword}
                      className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Reset Password
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Personal Details</h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-gray-500 text-xs">Full Name</dt>
                        <dd className="text-gray-900">{selectedFaculty.faculty.fullName}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 text-xs">Email</dt>
                        <dd className="text-gray-900">{selectedFaculty.user?.email}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 text-xs">Phone</dt>
                        <dd className="text-gray-900">{selectedFaculty.faculty.phone}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 text-xs">Department</dt>
                        <dd className="text-gray-900">{selectedFaculty.faculty.department}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 text-xs">Mode</dt>
                        <dd className="text-gray-900">{selectedFaculty.faculty.mode}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 text-xs">Designation</dt>
                        <dd className="text-gray-900">{selectedFaculty.faculty.designation}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Account & System Details</h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-gray-500 text-xs">Faculty ID</dt>
                        <dd className="text-gray-900">{selectedFaculty.faculty.facultyId}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 text-xs">Role</dt>
                        <dd className="text-gray-900">{selectedFaculty.user?.role}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 text-xs">Last Login</dt>
                        <dd className="text-gray-900">{selectedFaculty.user?.lastLogin ? new Date(selectedFaculty.user.lastLogin).toLocaleString() : '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 text-xs">Created At</dt>
                        <dd className="text-gray-900">{selectedFaculty.faculty.createdAt ? new Date(selectedFaculty.faculty.createdAt).toLocaleString() : '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 text-xs">Updated At</dt>
                        <dd className="text-gray-900">{selectedFaculty.faculty.updatedAt ? new Date(selectedFaculty.faculty.updatedAt).toLocaleString() : '—'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Groups Assigned</h3>
                  {(!selectedFaculty.groups || selectedFaculty.groups.length === 0) ? (
                    <p className="text-sm text-gray-500">No groups assigned to this faculty.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedFaculty.groups.map(renderGroupCard)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Faculty Profile</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={editForm.fullName}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <select
                    name="department"
                    value={editForm.department}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select department</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="ASH">ASH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
                  <select
                    name="mode"
                    value={editForm.mode}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select mode</option>
                    <option value="Regular">Regular</option>
                    <option value="Adjunct">Adjunct</option>
                    <option value="On Lien">On Lien</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
                  <select
                    name="designation"
                    value={editForm.designation}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select designation</option>
                    <option value="HOD">HOD</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Adjunct Assistant Professor">Adjunct Assistant Professor</option>
                    <option value="Assistant Registrar">Assistant Registrar</option>
                    <option value="TPO">TPO</option>
                    <option value="Warden">Warden</option>
                    <option value="Chief Warden">Chief Warden</option>
                    <option value="Associate Dean">Associate Dean</option>
                    <option value="Coordinator(PG, PhD)">Coordinator(PG, PhD)</option>
                    <option value="Tenders/Purchase">Tenders/Purchase</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Password</h2>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Share this password securely with the faculty. They should change it after logging in.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newPassword}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                />
                <button
                  type="button"
                  onClick={copyPassword}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Copy
                </button>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageFaculty;
