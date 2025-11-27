import React, { useState } from 'react';
import { studentAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import { showError, showSuccess } from '../../utils/toast';

const StudentProfileCard = ({ data, onUpdated }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
    branch: '',
    misNumber: ''
  });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (!data || !data.student) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-500">
        Select a student from the list to view profile.
      </div>
    );
  }

  const { student, groups, internships, currentProjects } = data;
  const user = student.user || null;

  const openEdit = () => {
    setEditForm({
      fullName: student.fullName || '',
      email: user?.email || '',
      contactNumber: student.contactNumber || '',
      branch: student.branch || '',
      misNumber: student.misNumber || ''
    });
    setIsEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editForm.email && !emailRegex.test(editForm.email)) {
      showError('Invalid email format');
      return;
    }
    const phoneRegex = /^\d{10}$/;
    if (editForm.contactNumber && !phoneRegex.test(editForm.contactNumber)) {
      showError('Please enter a valid 10-digit phone number');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        fullName: editForm.fullName,
        email: editForm.email,
        contactNumber: editForm.contactNumber,
        branch: editForm.branch,
        misNumber: editForm.misNumber
      };
      const response = await studentAPI.updateStudent(student._id, payload);
      const message = response.message || 'Student updated successfully';
      showSuccess(message);
      setIsEditOpen(false);
      if (onUpdated) {
        onUpdated();
      }
    } catch (error) {
      const message = handleApiError(error, false);
      showError(message || 'Failed to update student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (isResetting) return;
    const confirmed = window.confirm('Reset password for this student? A new random password will be generated.');
    if (!confirmed) return;
    try {
      setIsResetting(true);
      const response = await studentAPI.resetPassword(student._id);
      const generated = response.data?.newPassword || response.newPassword || '';
      if (generated) {
        setNewPassword(generated);
        setIsResetModalOpen(true);
      }
      showSuccess('Password reset successfully');
    } catch (error) {
      const message = handleApiError(error, false);
      showError(message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
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

  const currentGroups = (groups && groups.current) || [];
  const pastGroups = (groups && groups.past) || [];

  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{student.fullName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {student.branch} 
            {student.branch && student.degree ? ' • ' : ''}
            {student.degree} 
            {student.semester ? ` • Sem ${student.semester}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openEdit}
            className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-800 text-xs font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={handleResetPassword}
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {isResetting ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Editable Details</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">Full Name</dt>
              <dd className="text-gray-900">{student.fullName || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Email</dt>
              <dd className="text-gray-900">{user?.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Phone</dt>
              <dd className="text-gray-900">{student.contactNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Department</dt>
              <dd className="text-gray-900">{student.branch || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">MIS Number</dt>
              <dd className="text-gray-900">{student.misNumber || '—'}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Account Details</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">Student ID</dt>
              <dd className="text-gray-900">{student._id}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Role</dt>
              <dd className="text-gray-900">{user?.role || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Degree</dt>
              <dd className="text-gray-900">{student.degree || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Semester</dt>
              <dd className="text-gray-900">{student.semester || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Academic Year</dt>
              <dd className="text-gray-900">{student.academicYear || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Created At</dt>
              <dd className="text-gray-900">{formatDateTime(student.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Updated At</dt>
              <dd className="text-gray-900">{formatDateTime(student.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Last Login</dt>
              <dd className="text-gray-900">{formatDateTime(user?.lastLogin)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Current Group</h3>
          {currentGroups.length === 0 ? (
            <p className="text-sm text-gray-500">No active group.</p>
          ) : (
            <div className="space-y-3">
              {currentGroups.map((group) => (
                <div key={group.groupId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{group.project?.title || 'Group Project'}</p>
                      <p className="text-xs text-gray-500">ID: {group.groupId}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Sem {group.semester}
                      </span>
                      {group.academicYear ? (
                        <p className="text-xs text-gray-500 mt-1">{group.academicYear}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-gray-700 mb-2">
                    <p>Role: <span className="font-medium capitalize">{group.role}</span></p>
                    {group.faculty && (
                      <p>Faculty: <span className="font-medium">{group.faculty.fullName}</span></p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Members</h4>
                    <div className="space-y-1">
                      {group.members && group.members.length > 0 ? (
                        group.members.map((member) => (
                          <div key={member.studentId || member.misNumber} className="flex justify-between text-xs">
                            <span className="text-gray-900">{member.fullName || '—'}</span>
                            <span className="text-gray-500">{member.misNumber || '—'}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">No members listed.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Past Groups</h3>
          {pastGroups.length === 0 ? (
            <p className="text-sm text-gray-500">No past groups.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {pastGroups.map((group) => (
                <div key={group.groupId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{group.project?.title || 'Group Project'}</p>
                      <p className="text-xs text-gray-500">ID: {group.groupId}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Sem {group.semester}
                      </span>
                      {group.academicYear ? (
                        <p className="text-xs text-gray-500 mt-1">{group.academicYear}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-gray-700 mb-2">
                    <p>Role: <span className="font-medium capitalize">{group.role}</span></p>
                    {group.faculty && (
                      <p>Faculty: <span className="font-medium">{group.faculty.fullName}</span></p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Members</h4>
                    <div className="space-y-1">
                      {group.members && group.members.length > 0 ? (
                        group.members.map((member) => (
                          <div key={member.studentId || member.misNumber} className="flex justify-between text-xs">
                            <span className="text-gray-900">{member.fullName || '—'}</span>
                            <span className="text-gray-500">{member.misNumber || '—'}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">No members listed.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Internship History</h3>
          {(!internships || internships.length === 0) ? (
            <p className="text-sm text-gray-500">No internship records found.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {internships.map((internship) => {
                const details = internship.details || {};
                const companyName =
                  details.companyName ||
                  internship.companyName ||
                  internship.company ||
                  'Company';
                const role =
                  details.roleOrNatureOfWork ||
                  internship.role ||
                  null;
                const startDate = details.startDate || internship.startDate;
                const endDate = details.endDate || internship.endDate;
                const mentorName = details.mentorName;
                const mentorEmail = details.mentorEmail;
                const mentorPhone = details.mentorPhone;

                return (
                  <div
                    key={internship._id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-xs"
                  >
                    <div className="flex justify-between mb-1">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {companyName}
                        </div>
                        {(internship.semester || internship.academicYear) && (
                          <div className="mt-0.5 text-[11px] text-gray-500">
                            {internship.semester ? `Sem ${internship.semester}` : ''}
                            {internship.semester && internship.academicYear ? ' • ' : ''}
                            {internship.academicYear || ''}
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        {internship.type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium capitalize">
                            {internship.type}
                          </span>
                        )}
                        {internship.status && (
                          <div className="text-[11px] text-gray-600 capitalize">
                            Status:{' '}
                            <span className="font-medium">{internship.status}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-700 space-y-1">
                      {role && (
                        <p>
                          Role:{' '}
                          <span className="font-medium">{role}</span>
                        </p>
                      )}
                      {(startDate || endDate) && (
                        <p>
                          Dates:{' '}
                          <span className="font-medium">
                            {startDate
                              ? new Date(startDate).toLocaleDateString()
                              : '—'}
                            {' '}–{' '}
                            {endDate
                              ? new Date(endDate).toLocaleDateString()
                              : '—'}
                          </span>
                        </p>
                      )}
                      {(mentorName || mentorEmail || mentorPhone) && (
                        <p>
                          Mentor:{' '}
                          <span className="font-medium">
                            {mentorName || '—'}
                            {(mentorEmail || mentorPhone) && ' • '}
                            {[mentorEmail, mentorPhone].filter(Boolean).join(' / ')}
                          </span>
                        </p>
                      )}
                      {details.location && (
                        <p>
                          Location:{' '}
                          <span className="font-medium">{details.location}</span>
                        </p>
                      )}
                      {details.hasStipend && (
                        <p>
                          Stipend:{' '}
                          <span className="font-medium">
                            {details.hasStipend === 'yes'
                              ? (typeof details.stipendRs === 'number'
                                  ? `₹${details.stipendRs}`
                                  : 'Yes')
                              : 'No'}
                          </span>
                        </p>
                      )}
                      {details.offerLetterLink && (
                        <p>
                          Offer Letter:{' '}
                          <a
                            href={details.offerLetterLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline font-medium"
                          >
                            View
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Current Projects</h3>
          {(!currentProjects || currentProjects.length === 0) ? (
            <p className="text-sm text-gray-500">No current projects.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {currentProjects.map((item) => (
                <div key={item._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-xs">
                  <div className="flex justify-between mb-1">
                    <div className="font-semibold text-gray-900">{item.title || 'Project'}</div>
                    <div className="text-gray-500 capitalize">{item.status}</div>
                  </div>
                  <div className="text-gray-700">
                    {item.domain && (
                      <p>Domain: <span className="font-medium">{item.domain}</span></p>
                    )}
                    {item.semester && (
                      <p>Semester: <span className="font-medium">{item.semester}</span></p>
                    )}
                    {item.role && (
                      <p>Role: <span className="font-medium capitalize">{item.role}</span></p>
                    )}
                    <p>
                      Joined At:
                      <span className="font-medium">
                        {' '}
                        {item.joinedAt ? new Date(item.joinedAt).toLocaleDateString() : '—'}
                      </span>
                    </p>
                    {item.assignedFaculty && (
                      <p>
                        Faculty: <span className="font-medium">{item.assignedFaculty.fullName}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Student Profile</h2>
              <button
                type="button"
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
                    name="contactNumber"
                    value={editForm.contactNumber}
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
                    name="branch"
                    value={editForm.branch}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select department</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">MIS Number</label>
                  <input
                    type="text"
                    name="misNumber"
                    value={editForm.misNumber}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
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
                Share this password securely with the student. They should change it after logging in.
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

export default StudentProfileCard;
