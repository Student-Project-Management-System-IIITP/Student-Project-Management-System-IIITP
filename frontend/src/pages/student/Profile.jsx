import React, { useEffect, useState } from 'react';
import { studentAPI, authAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { 
  FiUser, FiMail, FiPhone, FiBook, FiCalendar,
  FiEdit, FiCheck, FiX, FiLock, FiShield, FiHash
} from 'react-icons/fi';

const StudentProfile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Password modal state
  const [isPwOpen, setIsPwOpen] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Edit state
  const [editForm, setEditForm] = useState({ fullName: '', contactNumber: '', email: '', branch: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await studentAPI.getProfile();
      if (res.success) {
        setProfileData(res.data);
        setEditForm({
          fullName: res.data.student.fullName || '',
          contactNumber: res.data.student.contactNumber || '',
          email: res.data.user?.email || '',
          branch: res.data.student.branch || ''
        });
      } else {
        setError(res.message || 'Failed to fetch profile');
      }
    } catch (e) {
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const updateProfile = async () => {
    try {
      setEditSubmitting(true);
      const studentPayload = {};
      if (editForm.fullName !== profileData?.student?.fullName) studentPayload.fullName = editForm.fullName;
      if (editForm.contactNumber !== profileData?.student?.contactNumber) studentPayload.contactNumber = editForm.contactNumber;

      const authPayload = {};
      if (editForm.email && editForm.email !== profileData?.user?.email) authPayload.email = editForm.email;

      if (Object.keys(studentPayload).length === 0 && Object.keys(authPayload).length === 0) {
        setIsEditMode(false);
        toast.success('No changes to save');
        setEditSubmitting(false);
        return;
      }

      // Update auth email first if changed
      if (Object.keys(authPayload).length > 0) {
        const authRes = await authAPI.updateProfile(authPayload);
        if (!authRes.success) {
          toast.error(authRes.message || 'Failed to update email');
          setEditSubmitting(false);
          return;
        }
      }

      // Update student fields if needed
      if (Object.keys(studentPayload).length > 0) {
        const stuRes = await studentAPI.updateProfile(studentPayload);
        if (!stuRes.success) {
          toast.error(stuRes.message || 'Failed to update profile');
          setEditSubmitting(false);
          return;
        }
      }

      toast.success('Profile updated successfully');
      setIsEditMode(false);
      await fetchProfile();
    } catch (_e) {
      toast.error('Failed to update profile');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError('Please fill all fields');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New password and confirm password do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters long');
      return;
    }
    try {
      setPwSubmitting(true);
      const res = await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      if (res.success) {
        setPwSuccess('Password changed successfully');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setIsPwOpen(false), 1200);
      } else {
        setPwError(res.message || 'Failed to change password');
      }
    } catch (_e) {
      setPwError('Failed to change password');
    } finally {
      setPwSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-neutral-700 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUser className="w-8 h-8 text-error-600" />
          </div>
          <h3 className="text-lg font-bold text-neutral-800 mb-2">Unable to Load Profile</h3>
          <p className="text-neutral-600 mb-4">{error}</p>
          <button onClick={fetchProfile} className="btn-primary inline-flex items-center gap-2">
            <FiActivity className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { student, user: userData } = profileData || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-200 via-primary-50 to-secondary-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiUser className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-800">Student Profile</h1>
                <p className="text-xs text-neutral-600 mt-0.5">Manage your information</p>
              </div>
            </div>
            {/* Account Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              userData?.isActive 
                ? 'bg-success-100 text-success-800 border border-success-200' 
                : 'bg-error-100 text-error-800 border border-error-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${userData?.isActive ? 'bg-success-500' : 'bg-error-500'}`}></span>
              {userData?.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-5 pb-8 space-y-4">
        {/* Profile Summary - Full Width */}
        <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="bg-gradient-to-br from-primary-600 to-secondary-600 p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <FiUser className="w-8 h-8 text-primary-600" />
              </div>
              <div className="flex-1 text-white min-w-0">
                <h2 className="text-xl font-bold truncate">{student?.fullName || 'Student'}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-white/90">
                  <span className="flex items-center gap-1.5">
                    <FiHash className="w-3 h-3" />
                    {student?.misNumber || 'N/A'}
                  </span>
                  <span>•</span>
                  <span>{student?.degree}</span>
                  <span>•</span>
                  <span>{student?.branch}</span>
                  <span>•</span>
                  <span>Sem {student?.semester}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout - Personal Info & Academic Details */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Personal Information */}
          <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                <FiUser className="w-4 h-4 text-primary-600" />
                Personal Information
              </h3>
              {!isEditMode && (
                <button 
                  onClick={() => setIsEditMode(true)} 
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium inline-flex items-center gap-1.5"
                >
                  <FiEdit className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>

            {isEditMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    <FiUser className="w-3.5 h-3.5 inline mr-1.5" />
                    Full Name *
                  </label>
                  <input 
                    type="text" 
                    value={editForm.fullName} 
                    onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} 
                    className="input-base" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    <FiPhone className="w-3.5 h-3.5 inline mr-1.5" />
                    Contact Number *
                  </label>
                  <input 
                    type="tel" 
                    value={editForm.contactNumber} 
                    onChange={e => setEditForm({ ...editForm, contactNumber: e.target.value })} 
                    className="input-base" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    <FiMail className="w-3.5 h-3.5 inline mr-1.5" />
                    Email *
                  </label>
                  <input 
                    type="email" 
                    value={editForm.email} 
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })} 
                    className="input-base" 
                    required 
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={updateProfile} 
                    disabled={editSubmitting} 
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    {editSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsEditMode(false)} 
                    className="btn-secondary inline-flex items-center gap-2"
                  >
                    <FiX className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <label className="text-xs font-medium text-neutral-600 mb-1 flex items-center gap-1.5">
                    <FiUser className="w-3.5 h-3.5" />
                    Full Name
                  </label>
                  <p className="text-sm font-semibold text-neutral-800">{student?.fullName || 'Not provided'}</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <label className="text-xs font-medium text-neutral-600 mb-1 flex items-center gap-1.5">
                    <FiPhone className="w-3.5 h-3.5" />
                    Contact Number
                  </label>
                  <p className="text-sm font-semibold text-neutral-800">{student?.contactNumber || 'Not provided'}</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <label className="text-xs font-medium text-neutral-600 mb-1 flex items-center gap-1.5">
                    <FiMail className="w-3.5 h-3.5" />
                    Email
                  </label>
                  <p className="text-sm font-semibold text-neutral-800">{userData?.email || 'Not provided'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Academic Details */}
          <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-5">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <FiBook className="w-4 h-4 text-primary-600" />
              Academic Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
                <label className="text-xs font-medium text-primary-700 mb-1 flex items-center gap-1.5">
                  <FiBook className="w-3 h-3" />
                  Degree
                </label>
                <p className="text-sm font-bold text-primary-900">{student?.degree || 'N/A'}</p>
              </div>
              <div className="bg-secondary-50 rounded-lg p-3 border border-secondary-200">
                <label className="text-xs font-medium text-secondary-700 mb-1 flex items-center gap-1.5">
                  <FiBook className="w-3 h-3" />
                  Branch
                </label>
                <p className="text-sm font-bold text-secondary-900">{student?.branch || 'N/A'}</p>
              </div>
              <div className="bg-accent-50 rounded-lg p-3 border border-accent-200">
                <label className="text-xs font-medium text-accent-700 mb-1 flex items-center gap-1.5">
                  <FiCalendar className="w-3 h-3" />
                  Academic Year
                </label>
                <p className="text-sm font-bold text-accent-900">{student?.academicYear || 'N/A'}</p>
              </div>
              <div className="bg-info-50 rounded-lg p-3 border border-info-200">
                <label className="text-xs font-medium text-info-700 mb-1 flex items-center gap-1.5">
                  <FiHash className="w-3 h-3" />
                  Semester
                </label>
                <p className="text-sm font-bold text-info-900">{student?.semester ?? 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section - Full Width at Bottom */}
        <div className="bg-surface-100 rounded-xl shadow-sm border border-neutral-200 p-5">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2 justify-center">
              <FiShield className="w-5 h-5 text-error-600" />
              Account Security
            </h3>
            <div className="text-center mb-4">
              <p className="text-sm text-neutral-600">
                Keep your account secure by using a strong password. It's recommended to change your password regularly.
              </p>
            </div>
            <div className="flex justify-center">
              <button 
                onClick={() => setIsPwOpen(true)} 
                className="bg-error-600 hover:bg-error-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
              >
                <FiLock className="w-4 h-4" />
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {isPwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-100 w-full max-w-md rounded-xl shadow-2xl mx-4 border border-neutral-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-primary-600 to-secondary-600 rounded-t-xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FiLock className="w-5 h-5" />
                Change Password
              </h3>
              <button 
                onClick={() => { 
                  setIsPwOpen(false); 
                  setPwError(''); 
                  setPwSuccess(''); 
                  setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); 
                }} 
                className="text-white/80 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              {pwError && (
                <div className="alert-error rounded-lg p-3 flex items-start gap-2">
                  <FiX className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{pwError}</p>
                </div>
              )}
              {pwSuccess && (
                <div className="alert-success rounded-lg p-3 flex items-start gap-2">
                  <FiCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{pwSuccess}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    <FiLock className="w-3.5 h-3.5 inline mr-1.5" />
                    Current Password
                  </label>
                  <input 
                    type="password" 
                    value={pwForm.currentPassword} 
                    onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} 
                    className="input-base" 
                    required 
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    <FiShield className="w-3.5 h-3.5 inline mr-1.5" />
                    New Password
                  </label>
                  <input 
                    type="password" 
                    value={pwForm.newPassword} 
                    onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} 
                    className="input-base" 
                    required 
                    minLength={6}
                    placeholder="Enter new password (min 6 chars)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    <FiCheck className="w-3.5 h-3.5 inline mr-1.5" />
                    Confirm New Password
                  </label>
                  <input 
                    type="password" 
                    value={pwForm.confirmPassword} 
                    onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} 
                    className="input-base" 
                    required 
                    minLength={6}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { 
                    setIsPwOpen(false); 
                    setPwError(''); 
                    setPwSuccess(''); 
                    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); 
                  }} 
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <FiX className="w-4 h-4" />
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={pwSubmitting} 
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {pwSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
