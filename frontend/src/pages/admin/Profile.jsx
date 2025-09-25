import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const AdminProfile = () => {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPwOpen, setIsPwOpen] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3000/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setAdmin(data.data.roleData || null);
        }
      } catch (err) {
        // noop
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Profile</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-gray-900 font-medium">{user?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-gray-900 font-medium">{user?.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-gray-900 font-medium">{user?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Account Status</p>
              <p className="text-gray-900 font-medium">{user?.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Admin ID</p>
              <p className="text-gray-900 font-medium">{admin?.adminId || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Department</p>
              <p className="text-gray-900 font-medium">{admin?.department || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Designation</p>
              <p className="text-gray-900 font-medium">{admin?.designation || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Super Admin</p>
              <p className="text-gray-900 font-medium">{admin?.isSuperAdmin ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </section>

        <div className="pt-2">
          <button
            onClick={() => { setPwError(''); setPwSuccess(''); setIsPwOpen(true); }}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Change Password
          </button>
        </div>
      </div>

      {isPwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button onClick={() => setIsPwOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={async (e) => {
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
                try {
                  setPwSubmitting(true);
                  const token = localStorage.getItem('token');
                  const res = await fetch('http://localhost:3000/admin/change-password', {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      currentPassword: pwForm.currentPassword,
                      newPassword: pwForm.newPassword
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setPwSuccess('Password changed successfully');
                    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  } else {
                    setPwError(data.message || 'Failed to change password');
                  }
                } catch (err) {
                  setPwError('Network error. Please try again.');
                } finally {
                  setPwSubmitting(false);
                }
              }}
            >
              {pwError && <div className="text-red-600 text-sm">{pwError}</div>}
              {pwSuccess && <div className="text-green-600 text-sm">{pwSuccess}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsPwOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700">Cancel</button>
                <button type="submit" disabled={pwSubmitting} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                  {pwSubmitting ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;


