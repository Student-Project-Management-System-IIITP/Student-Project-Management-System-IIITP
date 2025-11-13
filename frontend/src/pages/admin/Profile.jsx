import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, authAPI } from '../../utils/api';
import { handleApiError } from '../../utils/errorHandler';
import { toast } from 'react-hot-toast';

const AdminProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPwOpen, setIsPwOpen] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwForm, setPwForm] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    department: '',
    designation: '',
    email: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Fetch admin profile data
    const fetchProfile = async () => {
      try {
      setLoading(true);
      setError(null);
      
      const response = await adminAPI.getProfile();
      
      if (response.success) {
        setProfileData(response.data);
        setEditForm({
          fullName: response.data.admin.fullName || '',
          phone: response.data.admin.phone || '',
          department: response.data.admin.department || '',
          designation: response.data.admin.designation || '',
          email: response.data.user?.email || ''
        });
      } else {
        setError(response.message || 'Failed to fetch profile data');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

  // Update profile
  const updateProfile = async () => {
    try {
      setEditSubmitting(true);
      
      const response = await adminAPI.updateProfile(editForm);
      
      if (response.success) {
        setProfileData(response.data);
        setIsEditMode(false);
        toast.success('Profile updated successfully!');
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    
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
      const response = await authAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      
      if (response.success) {
        setPwSuccess('Password changed successfully');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setIsPwOpen(false), 1500);
      } else {
        setPwError(response.message || 'Failed to change password');
      }
    } catch (err) {
      setPwError('Failed to change password. Please try again.');
    } finally {
      setPwSubmitting(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Profile</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchProfile}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { admin, user: userData } = profileData || {};

  return (
    <div className="pro-page py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="pro-h1">Admin Profile</h1>
          <p className="mt-1 pro-muted">Manage your administrative account and profile information</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information Card */}
          <div className="pro-card p-6">
            <div className="pro-section flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center">
                <div className="pro-section-icon bg-blue-100">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="pro-section-title ml-2 pro-h2">Personal Information</h2>
              </div>
              {!isEditMode && (
                <button onClick={() => setIsEditMode(true)} className="pro-btn-primary px-4 py-2 text-sm shadow-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {isEditMode ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input type="text" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="pro-input" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <select value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} className="pro-input">
                      <option value="">Select Department</option>
                      <option value="CSE">Computer Science & Engineering</option>
                      <option value="ECE">Electronics & Communication Engineering</option>
                      <option value="ASH">Applied Sciences & Humanities</option>
                      <option value="ADMINISTRATION">Administration</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                    <select value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} className="pro-input">
                      <option value="">Select Designation</option>
                      <option value="Super Admin">Super Admin</option>
                      <option value="Department Admin">Department Admin</option>
                      <option value="System Admin">System Admin</option>
                      <option value="Academic Admin">Academic Admin</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                    <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="pro-input" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="pro-input" required />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <button
                    onClick={updateProfile}
                    disabled={editSubmitting}
                    className="pro-btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="pro-btn-secondary w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <div className="pro-kv">{admin?.fullName || 'Not provided'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <div className="pro-kv">{admin?.phone || 'Not provided'}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <div className="pro-kv">{admin?.department || 'Not assigned'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                    <div className="pro-kv">{admin?.designation || 'Not assigned'}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="pro-kv break-words">{userData?.email || 'Not provided'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Account Information Card */}
          <div className="pro-card p-6">
            <div className="pro-section flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center">
                <div className="pro-section-icon bg-indigo-100">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="pro-section-title ml-2 pro-h2">Account Information</h2>
              </div>
              <div className="flex items-center ml-4">
                <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${userData?.isActive ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`} style={{minWidth:'80px'}}>
                  <span className={`w-2 h-2 rounded-full inline-block ${userData?.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {userData?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin ID</label>
                <div className="pro-kv">{admin?.adminId || 'Not provided'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Administrative Level</label>
                <div className="pro-kv">{admin?.isSuperAdmin ? 'Super Admin' : 'Standard Admin'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Login</label>
                <div className="pro-kv">
                  {userData?.lastLogin 
                    ? new Date(userData.lastLogin).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Never'
                  }
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                <div className="pro-kv">
                  {admin?.createdAt 
                    ? new Date(admin.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Unknown'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Password Change Modal */}
      {isPwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                <button 
                  onClick={() => {
                    setIsPwOpen(false);
                setPwError('');
                setPwSuccess('');
                    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                {pwError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-700 text-sm font-medium">{pwError}</p>
                    </div>
                  </div>
                )}
                {pwSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-green-700 text-sm font-medium">{pwSuccess}</p>
                    </div>
                  </div>
                )}
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                      className="pro-input"
                    required
                  />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                      className="pro-input"
                    required
                      minLength={6}
                  />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                      className="pro-input"
                    required
                      minLength={6}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsPwOpen(false);
                      setPwError('');
                      setPwSuccess('');
                      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }} 
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={pwSubmitting} 
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {pwSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 flex justify-center">
        <button
          onClick={() => setIsPwOpen(true)}
          className="pro-btn-danger"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Change Password
        </button>
      </div>
    </div>
  );
};

export default AdminProfile;